(() => {
  "use strict";
  const nativeFetch = window.fetch.bind(window);
  const files = ["glossary-1.json", "glossary-2.json", "glossary-3.json", "glossary-4.json", "glossary-5.json"];

  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input?.url;
    if (url !== "glossary.json") return nativeFetch(input, init);

    const payloads = await Promise.all(files.map(async file => {
      const response = await nativeFetch(file, { ...init, cache: "no-store" });
      if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
      return response.json();
    }));

    return new Response(JSON.stringify({ entries: payloads.flatMap(payload => payload.entries || []) }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };
})();
