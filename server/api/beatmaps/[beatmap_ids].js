export default defineEventHandler((event) => {
    async function fetchBeatmaps() {
        const req_headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            Authorization: event.node.req.headers.authorization
        }

        const ids_query = event.context.params.beatmap_ids

        let obj
        const res = await fetch(`https://osu.ppy.sh/api/v2/beatmaps?${ids_query}`, {headers: req_headers})
        obj = await res.json()

        return obj
    }

    return fetchBeatmaps().then(r => event.node.res.end(JSON.stringify(r)))
})