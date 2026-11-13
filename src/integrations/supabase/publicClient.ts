import { createLocalClient } from "@/lib/localClient";

export const supabasePublic = createLocalClient({ isPublic: true });
