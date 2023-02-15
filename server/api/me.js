export default defineEventHandler((event) => {
  async function fetchMe() {
    const req_headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      Authorization: event.node.req.headers.authorization
    }
    
    let obj
    const res = await fetch('https://osu.ppy.sh/api/v2/me/osu', {headers: req_headers})
    obj = await res.json()

    return obj
  }

  return fetchMe().then(r => event.node.res.end(JSON.stringify(r)))
})