const CovidSources = require('./covidsource').CovidSources
const sources = new CovidSources()


async function test() {

  let src = await sources.loadAll()

  console.log(src)

}

test()
