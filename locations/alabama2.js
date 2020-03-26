const countiesEndpoint = 'https://services7.arcgis.com/4RQmZZ0yaZkGR1zy/arcgis/rest/services/COV19_Public_Dashboard_ReadOnly/FeatureServer/0/query?f=json&where=CONFIRMED%20%3E%200&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=*&resultOffset=0&resultRecordCount=69&cacheHint=true'
const deathsEndpoint = 'https://services7.arcgis.com/4RQmZZ0yaZkGR1zy/arcgis/rest/services/COV19_Public_Dashboard_ReadOnly/FeatureServer/0/query?f=json&where=CONFIRMED%20%3E%200&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=*&outStatistics=%5B%7B%22statisticType%22%3A%22sum%22%2C%22onStatisticField%22%3A%22DIED%22%2C%22outStatisticFieldName%22%3A%22value%22%7D%5D&outSR=102100&cacheHint=true'

const locationName = 'Alabama'

const axios = require('axios')
const moment = require('moment-timezone')

class DataLocation {
  // Do whatever you need to get the return format like below:
  // {
  // name: 'state or something'
  // lastUpdated: 'unixtime'
  // total: 6,
  // totaldeaths: 0,
  // locations: [
  //     { county: 'Jefferson', cases: 6 }
  // ]
  static async getData () {
    return new Promise(async (resolve, reject) => {
      let format = {
        name: locationName,
        lastUpdated: moment().tz('America/Chicago').format('MMMM Do YYYY, h:mm:ss a') + " (CT)",
        total: 0,
        totaldeaths: 0,
        locations: []
      }

      let resCounties = await axios.get(countiesEndpoint)
      let resDeaths = await axios.get(deathsEndpoint)

      format.totaldeaths = resDeaths.data.features[0].attributes.value

      let data = resCounties.data
      let counties = data.features

      counties.forEach(countyraw => {
        let county = countyraw.attributes
        let countyName = county['CNTYNAME']
        let cases = county['CONFIRMED']
        let deaths = county['DIED']

        format.total = format.total + cases

        format.locations.push({
          county: countyName,
          cases: cases,
          deaths: deaths
        })
      })

      // sort from largest to smallest by cases
      format.locations = format.locations.sort((a, b) => {
        if (a.cases > b.cases) return -1
        if (b.cases > a.cases) return 1

        return 0
      })

      // get to p15 counties
      let otherCounties = format.locations.slice(15, format.locations.length)
      format.locations = format.locations.slice(0, 15)

      // map other counties and aggregate count
      let otherMapped = otherCounties.reduce((acc, el) => {
        acc.cases = acc.cases + el.cases
        acc.deaths = acc.deaths + el.deaths
        return acc
      }, {
        county: `${otherCounties.length} Other`,
        cases: 0,
        deaths: 0
      })

      console.log(otherCounties)

      format.locations.push(otherMapped)

      resolve(format)

    })
  }
}

module.exports = DataLocation