addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const notices = {
  // 'test-notice-1': { title: 'test notice', message: 'This is a test notice', body: 'More detail is **provided** here.\n\n- With bullet points!\n- The formatting!\n\n' },
  // remember: body is optional
}
/**
 * Respond with hello worker text
 * @param {Request} request
 */
async function handleRequest(request) {
  return new Response(JSON.stringify(notices, null, '\t'), {
    headers: { 'content-type': 'application/json' },
  })
}
