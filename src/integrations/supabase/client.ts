import { createLocalClient } from "@/lib/localClient";

export const supabase = createLocalClient({ isPublic: false });
