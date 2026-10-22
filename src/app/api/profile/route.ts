import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { getSupabaseAdmin, normalizeInstagramUsername } from "@/lib/supabase-admin";

const bucket = "profile-photos";
const maxPhotoBytes = 2 * 1024 * 1024;
const maxRequestBytes = 4.4 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

type ProfileRow = {
  user_id: string;
  display_name: string;
  branch: string;
  academic_year: string;
  instagram_username: string | null;
  photo_paths: string[];
};

function errorResponse(error: string, status: number) {
  return Response.json(
    { error },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

function profileResponse(body: unknown) {
  return Response.json(body, {
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
    },
  });
}

async function isValidImageFile(file: File) {
  if (!allowedImageTypes.has(file.type) || file.size === 0 || file.size > maxPhotoBytes) {
    return false;
  }

  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  return bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return errorResponse("Sign in to view your profile.", 401);

  const supabase = getSupabaseAdmin();
  if (!supabase) return errorResponse("Profile storage is not configured yet.", 503);

  const { data, error } = await supabase
    .from("student_profiles")
    .select("user_id, display_name, branch, academic_year, instagram_username, photo_paths")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Unable to load student profile:", error.message);
    return errorResponse("Couldn't load your profile. Please try again.", 500);
  }

  if (!data) return profileResponse({ profile: null });

  const profile = data as ProfileRow;
  const photoResults = await Promise.all(
    profile.photo_paths.map(async (path) => {
      if (!path.startsWith(`${userId}/`)) {
        console.error("Profile photo path does not belong to its owner.");
        return null;
      }
      const { data: signed, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60);
      if (signError) {
        console.error("Unable to sign profile photo URL:", signError.message);
        return null;
      }
      return { path, url: signed.signedUrl };
    }),
  );

  if (photoResults.some((photo) => photo === null)) {
    return errorResponse("Couldn't load your profile photos. Please try again.", 500);
  }

  return profileResponse({
    profile: {
      displayName: profile.display_name,
      branch: profile.branch,
      academicYear: profile.academic_year,
      instagramUsername: profile.instagram_username ?? "",
      photos: photoResults,
    },
  });
}

export async function PUT(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Sign in to save your profile.", 401);

  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin) return errorResponse("Profile updates must come from the app.", 403);
  let origin: string;
  try {
    origin = new URL(requestOrigin).origin;
  } catch {
    return errorResponse("Profile updates must come from the app.", 403);
  }
  const allowedOrigins = new Set([request.nextUrl.origin]);
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      allowedOrigins.add(new URL(process.env.NEXT_PUBLIC_APP_URL).origin);
    } catch {
      console.error("NEXT_PUBLIC_APP_URL must be a valid absolute URL.");
      return errorResponse("The app origin is misconfigured.", 500);
    }
  }
  if (!allowedOrigins.has(origin)) return errorResponse("Profile updates must come from the app.", 403);

  const supabase = getSupabaseAdmin();
  if (!supabase) return errorResponse("Profile storage is not configured yet.", 503);

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    return errorResponse("Submit your profile using the profile form.", 415);
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxRequestBytes) {
    return errorResponse("Profile uploads must be smaller than 4.4 MB in total.", 413);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Submit your profile using the profile form.", 400);
  }

  const displayName = String(formData.get("displayName") ?? "").trim();
  const branch = String(formData.get("branch") ?? "").trim();
  const academicYear = String(formData.get("academicYear") ?? "").trim();
  const instagramUsername = normalizeInstagramUsername(String(formData.get("instagramUsername") ?? ""));

  if (displayName.length < 1 || displayName.length > 80) {
    return errorResponse("Display name must be between 1 and 80 characters.", 400);
  }
  if (branch.length < 1 || branch.length > 100) {
    return errorResponse("Branch must be between 1 and 100 characters.", 400);
  }
  if (academicYear.length < 1 || academicYear.length > 40) {
    return errorResponse("Academic year must be between 1 and 40 characters.", 400);
  }
  if (instagramUsername === undefined) {
    return errorResponse("Enter a valid Instagram username or profile URL.", 400);
  }

  let retainedPaths: unknown;
  try {
    retainedPaths = JSON.parse(String(formData.get("retainedPhotoPaths") ?? "[]"));
  } catch {
    return errorResponse("The selected profile photos are invalid.", 400);
  }
  if (!Array.isArray(retainedPaths) || retainedPaths.some((path) => typeof path !== "string")) {
    return errorResponse("The selected profile photos are invalid.", 400);
  }

  const { data: existing, error: readError } = await supabase
    .from("student_profiles")
    .select("photo_paths")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) {
    console.error("Unable to read existing profile photos:", readError.message);
    return errorResponse("Couldn't update your profile. Please try again.", 500);
  }

  const existingPaths = (existing?.photo_paths ?? []) as string[];
  const keepPaths = retainedPaths as string[];
  if (
    keepPaths.length > 2
    || new Set(keepPaths).size !== keepPaths.length
    || keepPaths.some((path) => !existingPaths.includes(path) || !path.startsWith(`${userId}/`))
  ) {
    return errorResponse("One or more selected photos aren't part of your profile.", 400);
  }

  const photoEntries = formData.getAll("photos");
  if (photoEntries.length > 2 || photoEntries.some((value) => !(value instanceof File))) {
    return errorResponse("You can upload up to two photos.", 400);
  }
  const newFiles = photoEntries.filter((value): value is File => value instanceof File && value.size > 0);
  if (keepPaths.length + newFiles.length > 2) {
    return errorResponse("You can have up to two profile photos.", 400);
  }
  const filesValid = await Promise.all(newFiles.map(isValidImageFile));
  if (filesValid.some((valid) => !valid)) {
    return errorResponse("Photos must be valid JPEG, PNG or WebP images up to 2 MB each.", 400);
  }

  const uploadedPaths: string[] = [];
  for (const file of newFiles) {
    const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error("Unable to upload profile photo:", uploadError.message);
      if (uploadedPaths.length) {
        const { error: cleanupError } = await supabase.storage.from(bucket).remove(uploadedPaths);
        if (cleanupError) console.error("Unable to clean up incomplete profile photo upload:", cleanupError.message);
      }
      return errorResponse("Photo upload failed. Check your connection and try again.", 502);
    }
    uploadedPaths.push(path);
  }

  const nextPaths = [...keepPaths, ...uploadedPaths];
  const { error: saveError } = await supabase.from("student_profiles").upsert({
    user_id: userId,
    display_name: displayName,
    branch,
    academic_year: academicYear,
    instagram_username: instagramUsername,
    photo_paths: nextPaths,
    updated_at: new Date().toISOString(),
  });

  if (saveError) {
    console.error("Unable to save student profile:", saveError.message);
    if (uploadedPaths.length) {
      const { error: cleanupError } = await supabase.storage.from(bucket).remove(uploadedPaths);
      if (cleanupError) console.error("Unable to clean up unsaved profile photos:", cleanupError.message);
    }
    return errorResponse("Couldn't save your profile. Please try again.", 500);
  }

  const removedPaths = existingPaths.filter((path) => !nextPaths.includes(path));
  let cleanupWarning: string | undefined;
  if (removedPaths.length) {
    const { error: removeError } = await supabase.storage.from(bucket).remove(removedPaths);
    if (removeError) {
      console.error("Unable to remove replaced profile photos:", removeError.message);
      cleanupWarning = "Your profile was saved, but a removed photo couldn't be cleaned up. Contact support if it remains.";
    }
  }

  const photoResults = await Promise.all(
    nextPaths.map(async (path) => {
      const { data: signed, error: signError } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
      if (signError) {
        console.error("Unable to sign saved profile photo URL:", signError.message);
        return null;
      }
      return { path, url: signed.signedUrl };
    }),
  );
  if (photoResults.some((photo) => photo === null)) {
    return errorResponse("Your profile was saved, but its photos couldn't be displayed. Reload to retry.", 500);
  }

  return profileResponse({
    profile: {
      displayName,
      branch,
      academicYear,
      instagramUsername: instagramUsername ?? "",
      photos: photoResults,
    },
    ...(cleanupWarning ? { warning: cleanupWarning } : {}),
  });
}
