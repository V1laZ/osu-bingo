export default defineEventHandler((event) => {
  async function fetchToken() {
    const req_headers = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    }

    const req_body = await readBody(event)
    
    let obj
    const res = await fetch('https://osu.ppy.sh/oauth/token', {
      method: 'POST',
      headers: req_headers,
      body: JSON.stringify(req_body)
    })
    obj = await res.json()

    return obj
  }

  return fetchToken().then(r => event.node.res.end(JSON.stringify(r)))
})