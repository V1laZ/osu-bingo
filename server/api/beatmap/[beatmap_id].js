export default defineEventHandler((event) => {
    async function fetchBeatmap() {
        const req_headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            Authorization: event.node.req.headers.authorization
        }

        const beatmap_id = event.context.params.beatmap_id
        
        let obj
        const res = await fetch(`https://osu.ppy.sh/api/v2/beatmaps/lookup?id=${beatmap_id}`, {headers: req_headers})
        obj = await res.json()

        return obj
    }

    return fetchBeatmap().then(r => event.node.res.end(JSON.stringify(r)))
})