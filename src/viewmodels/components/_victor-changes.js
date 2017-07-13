/**
 * Contains changes made by me within the school-config.js file
 */

// line 390: Removed a console.log(args) when I was generating the school
// session list
/**
 * Handler for grading system
 */
function GradingSystemHandler() {
  let gs = this
  let args = arguments.length > 0
    ? arguments[0]
    : {}
  // props
  gs.id = vm
    .gradingSysFields()
    .length
  // observables
  gs.grade = ko.observable(args.grade || "")
  gs.score = ko.observable(args.score || null)
  gs.maxScore = ko.observable(args.maxScore || 100)
  // subscriptions
  gs
    .score
    .subscribe(s => {
      vm
        .gradingSysFields()
        .map((v) => {
          if (v.id > gs.id) 
            v.maxScore(s - 5)
        })
    })
}

// line 384: Automatically generate current school sessions
/**
 * Generates the session the school is currently on based on the current year
 */
function generateSession() {
  const currentYear = new Date().getFullYear()
  const currentSession = [
    `${currentYear - 1}/${currentYear}`,
    `${currentYear}/${currentYear + 1}`
  ]
  return currentSession
}

// line 243: Add a computed to keep track of whether or not the grading system
// field is empty
/**
 * Keeps track of status of the grading system fields (empty or not?)
 */
vm.gradingSysFieldsEmpty = ko.computed(() => {
  return !(vm.gradingSysFields().length > 0)
})

// line 176: Removes the last row from the grading system
/**
 * Removes the last row from the grading system
 */
vm.popLastGradingRow = () => {
  vm
    .gradingSysFields
    .pop()
}

// line 187: Add a new row
/**
 * Adds a new row to the grading system.
 */
vm.addField = () => {
  const gradingSysLength = vm
    .gradingSysFields()
    .length
  lastScore = gradingSysLength >= 1
    ? vm
      .gradingSysFields()[gradingSysLength - 1]
      .score() - 5
    : 100
  lastScore = lastScore < 0
    ? 100
    : lastScore
  vm
    .gradingSysFields
    .push(new GradingSystemHandler({maxScore: lastScore}))
  redraw()
}

// line 29: grading system
vm.gradingSysFields = ko.observableArray()

// FROM THE _server.js line 229
/**
 * Sets school operations & termilogies
 */
socket.on('set ops & term', (query, cb) => {
  if (expired(query)) 
    return
  query = query.payload || query
  let newQuery = []
  for (let i in query) 
    newQuery.push({label: i, value: query[i]})

  let DbAdmins = db('settings')
  DbAdmins
    .iu(newQuery)
    .then(() => cb(true))
    .catch(() => cb(false))

})

/**
 * Saves the school's grading system
 */
socket.on('save grading sys', (query, cb) => {
  if (expired(query)) 
    return
  query = query.payload || query
  let DbSettings = db('settings')
  DbSettings
    .iu({label: 'gradingSystem', value: query})
    .then(() => cb(true))
    .catch(() => cb(false))
})