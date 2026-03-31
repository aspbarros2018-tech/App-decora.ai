const url = "https://tasypbhoytjdtbx.supabase.co/storage/v1/object/public/operacional/9ip4xhzdrdf_1774659263494.pdf";
fetch(url, { headers: { "Range": "bytes=0-100" } })
  .then(res => {
    console.log(res.status, res.statusText);
    res.text().then(console.log);
  })
  .catch(console.error);
