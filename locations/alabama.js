const osmosis = require('osmosis')
const sourceurl = 'http://alabamapublichealth.gov/infectiousdiseases/2019-coronavirus.html'
const locationName = 'alabama'

class DataLocation {
  // Do whatever you need to get the format like below:
  // {
  // lastUpdated: 'unixtime'
  // total: 6
  // locations: [
  //     { county: 'Jefferson', cases: 6 }
  // ]
  static async getData () {
    return new Promise((resolve, reject) => {
      let results = []
      osmosis
        .get(sourceurl).find('#mainContent > div.row.mainContent > table:first tr').set({
        data: 'td[1]',
        cases: 'td[2]'
      })
        .data(item => results.push({data: item.data, cases: item.cases*1}))
        .done(() => {
          try{
            // Get last updated string
            const lastUpdatedString = results[0].data.split('Updated: ')[1]

            // Remove unnecessary rows
            results.splice(0, 2)
            results.pop()

            // Calculate total cases
            const totalCases = results.reduce((acc, county) => {
              return acc + county.cases
            }, 0)

            // Map keys to output schema
            const mapped = results.map(el => {
              return {county: el.data, cases: el.cases}
            })

            resolve({
              name: locationName,
              lastUpdated: lastUpdatedString,
              total: totalCases,
              locations: mapped
            })
          }catch(e){
            reject(e)
          }
        })
        .error(console.log)
    })
  }
}

module.exports = DataLocation