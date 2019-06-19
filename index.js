const xl = require('excel4node')
const request = require('request')
require('util').inspect.defaultOptions.depth = null
const cliProgress = require('cli-progress')

let stateProgressBar
const showStateProgress = (totalCountries) => {
    stateProgressBar = new cliProgress.Bar({
        format: 'State Data [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} | country: {country}'
    }, cliProgress.Presets.shades_classic)
    stateProgressBar.start(totalCountries, 0)
}

const updateStateProgress = (totalCountriesDone, countryName) => {
    stateProgressBar.update(totalCountriesDone, { country: countryName })
}

const stopStateProgress = () => {
    stateProgressBar.stop()
}

let cityProgressBar
const showCityProgress = (totalReqToMake) => {
    cityProgressBar = new cliProgress.Bar({
        format: 'City Data [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} | country: {country} | state: {state}'
    }, cliProgress.Presets.shades_classic)
    cityProgressBar.start(totalReqToMake, 0)
}

const updatecityProgress = (totalReqDone, countryName, stateName) => {
    cityProgressBar.update(totalReqDone, { country: countryName, state: stateName })
}

const stopcityogress = () => {
    cityProgressBar.stop()
}

const exportExcel = () => {
    console.log('exporting...')

    const wb = new xl.Workbook();

    const wsCountry = wb.addWorksheet('countrydata');
    const wsState = wb.addWorksheet('statedata');
    const wsCity = wb.addWorksheet('citydata');

    let stateIndex = 1;
    let cityIndex = 1;

    countryData.forEach(
        (country, index) => {
            wsCountry.cell(index + 1, 1).string(country.countryCode)
            wsCountry.cell(index + 1, 2).string(country.countryName)
            if (country.states) {
                country.states.forEach(
                    (state) => {
                        wsState.cell(stateIndex, 1).string(country.countryCode)
                        wsState.cell(stateIndex, 2).string(state.stateCode)
                        wsState.cell(stateIndex, 3).string(state.stateName)
                        if (state.cities) {
                            state.cities.forEach(
                                (city) => {
                                    wsCity.cell(cityIndex, 1).string(country.countryCode)
                                    wsCity.cell(cityIndex, 2).string(state.stateCode)
                                    wsCity.cell(cityIndex, 3).string(city.cityCode)
                                    wsCity.cell(cityIndex, 4).string(city.cityName)
                                }
                            )

                            cityIndex++
                        }

                        stateIndex++
                    }
                )
            }
        }
    )

    wb.write('exportedcountrydata.xlsx')
    console.log('DONE EXPORTING')
}

let countryData = []

const displayAllCountryData = () => {
    countryData.forEach(
        (country) => {
            console.log(country)
        }
    )

    exportExcel()
}

let countryIndexForCity = 0
let stateIndexForCity = 0
let totalStatesDone = 0

const getCities = () => {
    const country = countryData[countryIndexForCity]
    if (country.states) {
        const state = country.states[stateIndexForCity]
        const url = 'http://geodata.solutions/api/api.php?type=getCities&addClasses=order-alpha&countryId=' + country.countryCode + '&stateId=' + state.stateCode
        request.get(
            url,
            (error, response, body) => {
                if (error)
                    console.log(error)
                else {
                    let responseBody = JSON.parse(body)
                    responseBody = responseBody.result
                    Object.keys(responseBody).forEach(
                        (cityCode) => {
                            if (!state.cities)
                                state.cities = []
                            state.cities.push(
                                {
                                    cityCode,
                                    cityName: responseBody[cityCode]
                                }
                            )
                        }
                    )
                }


                if (countryIndexForCity == countryData.length - 1 &&
                    stateIndexForCity == country.states.length - 1) {
                    updatecityProgress(
                        totalStatesDone++,
                        countryData[countryIndexForCity].countryName,
                        countryData[countryIndexForCity].states[stateIndexForCity].stateName
                    )
                    stopcityogress()
                    displayAllCountryData()
                } else if (stateIndexForCity == country.states.length - 1) {
                    updatecityProgress(
                        totalStatesDone++,
                        countryData[countryIndexForCity].countryName,
                        countryData[countryIndexForCity].states[stateIndexForCity].stateName
                    )
                    countryIndexForCity++
                    stateIndexForCity = 0
                    getCities()
                } else {
                    updatecityProgress(
                        totalStatesDone++,
                        countryData[countryIndexForCity].countryName,
                        countryData[countryIndexForCity].states[stateIndexForCity].stateName
                    )
                    stateIndexForCity++
                    getCities()
                }
            }
        )
    } else {
        if (countryIndexForCity == countryData.length - 1) {
            updatecityProgress(
                totalStatesDone++,
                '', ''
            )
            stopcityogress()
            displayAllCountryData()
        }
        else {
            updatecityProgress(
                totalStatesDone++,
                '', ''
            )
            countryIndexForCity++
            stateIndexForCity = 0
            getCities()
        }
    }
}

let countryIndex = 0
let totalStates = 0

const getStates = () => {
    const country = countryData[countryIndex]
    const url = 'http://geodata.solutions/api/api.php?type=getStates&addClasses=order-alpha&countryId=' + country.countryCode
    request.get(
        url,
        (error, response, body) => {
            if (error)
                console.log(error)
            else {
                let responseBody = JSON.parse(body)
                responseBody = responseBody.result
                Object.keys(responseBody).forEach(
                    (stateCode) => {
                        if (!country.states)
                            country.states = []
                        country.states.push(
                            {
                                stateCode,
                                stateName: responseBody[stateCode]
                            }
                        )
                        totalStates++
                    }
                )
            }

            if (countryIndex == countryData.length - 1) {
                updateStateProgress(countryIndex + 1, country.countryName)
                stopStateProgress()
                console.log('DONE')
                console.log('Getting Cities')
                showCityProgress(
                    totalStates
                )
                getCities()
            }
            else {
                updateStateProgress(countryIndex + 1, country.countryName)
                getStates()
            }

            countryIndex++
        }
    )
}

const getCountries = () => {
    console.log('Getting countries')
    request.get(
        'http://geodata.solutions/api/api.php?type=getCountries&addClasses=order-alpha',
        (error, response, body) => {
            if (error)
                console.log(error)
            else {
                let responseBody = JSON.parse(body)
                responseBody = responseBody.result
                const keys = Object.keys(responseBody)
                keys.forEach(
                    (countryCode) => {
                        countryData.push(
                            {
                                countryCode,
                                countryName: responseBody[countryCode]
                            }
                        )
                    }
                )

                console.log('Done')

                console.log('Getting States')

                showStateProgress(
                    countryData.length
                )
                getStates()
            }
        }
    )
}

getCountries()