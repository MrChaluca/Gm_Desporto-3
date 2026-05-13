const url = 'https://oqqduqakrbhazgpktmyb.supabase.co/rest/v1/equipamentos?select=id&limit=1';
fetch(url, {
  headers: {
    apikey: 'sb_publishable__sliB9KAxI3pF1qDEnHWbQ_w0-gvuO2',
    Authorization: 'Bearer sb_publishable__sliB9KAxI3pF1qDEnHWbQ_w0-gvuO2',
    Accept: 'application/json'
  }
})
  .then(async res => {
    console.log('status', res.status, res.statusText);
    console.log('body', await res.text());
  })
  .catch(err => {
    console.error('fetch error', err);
  });
