// Botify Supabase client (loads from CDN via ESM)
// Exposes window.botifyDB with helpers.
(function () {
  const SUPABASE_URL = "https://upiuqimbbmavwueknegx.supabase.co";
  const SUPABASE_KEY = "sb_publishable_vEjwtQyrlJD3D3DcTNI4bA_P-Nh1PCr";

  async function init() {
    const mod = await import("https://esm.sh/@supabase/supabase-js@2");
    const client = mod.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "botify-auth" },
    });

    const api = {
      client,
      async getUser() {
        const { data } = await client.auth.getUser();
        return data.user || null;
      },
      async signUp(email, password, username) {
        return client.auth.signUp({
          email,
          password,
          options: { data: { username }, emailRedirectTo: window.location.origin + "/app.html" },
        });
      },
      async signIn(email, password) {
        return client.auth.signInWithPassword({ email, password });
      },
      async signOut() {
        return client.auth.signOut();
      },
      async listScripts() {
        const { data, error } = await client
          .from("scripts")
          .select("*")
          .eq("approved", true)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []).map((s) => ({
          id: s.id,
          nama: s.nama,
          kategori: s.kategori,
          deskripsi: s.deskripsi,
          thumbnail: s.thumbnail,
          status: s.status,
          rating: String(s.rating ?? "0"),
          views: s.views ?? 0,
          trending: !!s.trending,
          baru: !!s.baru,
          link: s.link,
          linkyt: s.linkyt || "",
          linkch: s.linkch || "",
          user_id: s.user_id,
        }));
      },
      async addScript({ nama, kategori, deskripsi, thumbnail, link }) {
        const user = await this.getUser();
        if (!user) throw new Error("Harus login dulu");
        const { data, error } = await client
          .from("scripts")
          .insert({
            user_id: user.id,
            nama,
            kategori,
            deskripsi,
            thumbnail: thumbnail || "",
            link,
            status: "Free",
            baru: true,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      async toggleFavorite(scriptId) {
        const user = await this.getUser();
        if (!user) throw new Error("Harus login dulu");
        const { data: existing } = await client
          .from("favorites")
          .select("script_id")
          .eq("user_id", user.id)
          .eq("script_id", scriptId)
          .maybeSingle();
        if (existing) {
          await client.from("favorites").delete().eq("user_id", user.id).eq("script_id", scriptId);
          return false;
        } else {
          await client.from("favorites").insert({ user_id: user.id, script_id: scriptId });
          return true;
        }
      },
      async listFavorites() {
        const user = await this.getUser();
        if (!user) return [];
        const { data } = await client.from("favorites").select("script_id").eq("user_id", user.id);
        return (data || []).map((r) => r.script_id);
      },
      async recordView(scriptId) {
        const user = await this.getUser();
        try {
          await client.from("script_views").insert({ user_id: user?.id || null, script_id: scriptId });
          await client.rpc; // no-op guard
        } catch (_) {}
        // Increment view count client-side (best-effort)
        try {
          await client.from("scripts").update({ views: undefined }).eq("id", scriptId);
        } catch (_) {}
      },
      async rate(scriptId, rating) {
        const user = await this.getUser();
        if (!user) throw new Error("Harus login dulu");
        const { error } = await client
          .from("script_ratings")
          .upsert({ user_id: user.id, script_id: scriptId, rating }, { onConflict: "user_id,script_id" });
        if (error) throw error;
      },
      async myHistory() {
        const user = await this.getUser();
        if (!user) return [];
        const { data } = await client
          .from("script_views")
          .select("script_id, viewed_at, scripts(nama, kategori, thumbnail)")
          .eq("user_id", user.id)
          .order("viewed_at", { ascending: false })
          .limit(50);
        return data || [];
      },
    };

    window.botifyDB = api;
    window.dispatchEvent(new Event("botifyDBReady"));
  }

  init().catch((e) => console.error("[botifyDB] init failed", e));
})();
