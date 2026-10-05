async function checkCode() {
  const url = 'https://whale-watch-474208523276.us-central1.run.app/map2d.js?v=1.1.6';
  try {
    const res = await fetch(url);
    const text = await res.text();
    const lines = text.split('\n');
    console.log("Lines 555 to 585:");
    for (let i = 555; i <= 585; i++) {
      console.log(`${i}: ${lines[i - 1]}`);
    }
  } catch (err) {
    console.error(err);
  }
}
checkCode();
