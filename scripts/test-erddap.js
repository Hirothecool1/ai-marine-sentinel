async function run() {
  const erddapUrl = 'https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41.json?analysed_sst%5B%28last%29%5D%5B%2837.1%29:10:%2838.5%29%5D%5B%28-123.5%29:10:%28-122.0%29%5D';
  console.log('Fetching:', erddapUrl);
  try {
    const res = await fetch(erddapUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 WhaleWatch/1.0' }
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Columns:', data.table.columnNames);
    console.log('Rows count:', data.table.rows.length);
    if (data.table.rows.length > 0) {
      console.log('Sample row:', data.table.rows[0]);
      console.log('Last row:', data.table.rows[data.table.rows.length - 1]);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
