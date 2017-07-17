var vm = function (params) {
    let vm = this

    // local vars
    const termsPerSessionLabels = ['Two', 'Three', 'Four', 'Five']
    let termsPerSessionArr = []
    for (let i = 1; i <= termsPerSessionLabels.length; i++) 
        termsPerSessionArr[i - 1] = new TermsPerSessHandler(i + 1, termsPerSessionLabels[i - 1])

        // school props
    let logoUri = DEFAULT_SCHOOL_LOGO

    // school props
    vm.logo = ko.observable()
    vm.schoolName = ko.observable()
    vm.schoolSlogan = ko.observable()
    vm.schoolAddress = ko.observable()
    vm.schoolDisplaysPositions = ko.observable()

    // ops & terminology
    vm.termsPerSessionLists = ko.observableArray(termsPerSessionArr)
    vm.subSession = ko.observable('term')
    vm.sessionNameList = ko.observableArray(generateSession())
    vm.sessionName = ko.observable()
    vm.termsPerSession = ko.observable()
    vm.currentTerm = ko.observable()

    // grading system
    vm.gradingSystem = new GradingSystem;

    // assessment metrics
    vm.metrics = new AssessmentMetrics()

    // states
    vm.logoChanged = ko.observable(false)
    vm.uiVisible = ko.observable(false)
    vm.uploadingLogo = ko.observable(false)
    vm.updatingProfile = ko.observable(false)
    vm.updatingOps = ko.observable(false)

    // behaviours
    vm.selectLogo = () => {
        let file = remote
            .dialog
            .showOpenDialog({
                title: "Choose school logo",
                message: "Choose school logo",
                filters: [
                    {
                        name: "Images",
                        extensions: ['jpg', 'png', 'gif', 'jpeg']
                    }
                ]
            })
        if (file) {
            vm.logo(file)
            vm.logoChanged(true)
        }
    }
    vm.resetLogo = () => {
        vm.logo(logoUri)
        vm.logoChanged(false)
    }
    vm.uploadLogo = () => {
        vm.uploadingLogo(true)
        // set up canvas
        let canvas = document.getElementById('canva'),
            ctx = canvas.getContext('2d')
        ctx.fillStyle = "#fdfffc"
        ctx.fillRect(0, 0, 512, 512)

        // draw
        let src = $('.school-logo')[0]
        _dimens = dimens(512)
        _offset = offset(_dimens, 512)
        ctx.drawImage(src, _offset.l, _offset.t, _dimens.w, _dimens.h)

        // save it up
        let canvasBuffer = require('electron-canvas-to-buffer')
        let buf = canvasBuffer(canvas, 'image/jpeg', 70)
        sockets.emit('update school logo', buf, d => {
            vm.uploadingLogo(false)
            if (!d.status) 
                VM.notify("Unable to reach server on Control Workstation", "error")
            else {
                if (!d.response) 
                    VM.notify("Logo upload failed", "error")
                else 
                    VM.notify("Logo uploaded successfully")
            }
        }, false, 10000)
    }
    vm.updateProfile = () => {
        if (_anyEmpty(vm.schoolName(), vm.schoolSlogan(), vm.schoolAddress())) 
            return VM.notify('You cannot leave any field empty', 'warn'),
            null
        vm.updatingProfile(true)
        sockets.emit('update school profile', {
            'schoolName': vm.schoolName(),
            'schoolSlogan': vm.schoolSlogan(),
            'schoolAddress': vm.schoolAddress(),
            'schoolDisplaysPositions': vm.schoolDisplaysPositions()
        }, data => {
            if (!data.status) 
                return VM.notify('Unable to update school profile, could not reach Control Workstation', 'error', {'Try again': vm.updateProfile}, 'retry profile update')
            else {
                if (!data.response) {
                    VM.notify("Problem updating school profile", "error")
                    vm.updatingProfile(false)
                } else {
                    let DbSettings = db('settings')
                    DbSettings
                        .iu(data.response)
                        .then(d => {
                            VM
                                .controlVm
                                .schoolName(vm.schoolName())
                            VM.controlVm.schoolSlogan = vm.schoolSlogan()
                            VM.controlVm.schoolAddress = vm.schoolAddress()
                            VM.controlVm.schoolDisplaysPositions = vm.schoolDisplaysPositions()

                            VM.notify("Profile updated successfully")
                            vm.updatingProfile(false)
                        })
                        .catch(e => {
                            VM.notify("Unable to update school profile", "error")
                            vm.updatingProfile(false)
                        })
                }
            }
        })
    }
    vm.updateOpsAndTerms = () => {
        // check if any filed is empty
        if (_anyEmpty(vm.subSession(), vm.sessionName(), vm.termsPerSession(), vm.currentTerm())) 
            return VM.notify('Please select all fields as appropriate', 'warn'),
            null

        vm.updatingOps(true)
        // send info to the socket
        sockets.emit('set ops & term', {
            'schoolSubSession': vm.subSession(),
            'schoolSessionName': vm.sessionName(),
            'schoolTermsPerSession': vm.termsPerSession(),
            'schoolCurrentTerm': vm.currentTerm()
        }, data => {
            if (!data.status) 
                return VM.notify('Problem updating Operations and Terminology, could not reach Control Workstation', 'error')
            else {
                if (data.response) {
                    let DbSettings = db('settings')
                    DbSettings.iu([
                        {
                            label: 'schoolSubSession',
                            value: vm.subSession()
                        }, {
                            label: 'schoolSessionName',
                            value: vm.sessionName()
                        }, {
                            label: 'schoolTermsPerSession',
                            value: vm.termsPerSession()
                        }, {
                            label: 'schoolCurrentTerm',
                            value: vm.currentTerm()
                        }
                    ]).then(d => {
                        VM.controlVm.schoolSubSession = vm.subSession()
                        VM.controlVm.schoolSessionName = vm.sessionName()
                        VM.controlVm.schoolTermsPerSession = vm.termsPerSession()
                        VM.controlVm.schoolCurrentTerm = vm.currentTerm()

                        VM.notify('Operations and Terminology successfully updated!')
                        vm.updatingOps(false)
                    }).catch(e => {
                        VM.notify("Unable to update Operations and Terminology", "error")
                        vm.updatingOps(false)
                    })
                } else {
                    VM.notify("Unable to update Operations and Terminology", "error")
                    vm.updatingOps(false)
                }
            }
        })
    }

    // subscription
    vm
        .logoChanged
        .subscribe(b => {
            if (b) 
                _tooltip()
        })

    // computed
    vm.currentTermList = ko.computed(() => {
        // dynamically generate list of curr terms
        let newCurrTermList = []
        for (let i = 0; i < vm.termsPerSession(); i++) 
            newCurrTermList[i] = new TermsPerSessHandler(i + 1, TERM_LABELS[i])
        return newCurrTermList
    })

    // sub vm
    function AssessmentMetrics() {
        let am = this

        // observables
        am.metrics = ko.observableArray()
        am.updatingMetrics = ko.observable(false)
        am.connected = ko.observable(false)

        // behaviours
        am.add = (vm, evt) => {
            if (am.metrics().length > 0) {
                let lm = am.metrics()[
                    am
                        .metrics()
                        .length - 1
                ]
                if (_anyEmpty(lm.title(), lm.label(), lm.marks(), lm.compo())) 
                    return VM.notify("Don't leave any detail out for the last metric", "warn"),
                    null
            }
            am
                .metrics
                .push(new Metric())
            redraw(evt) // redraw layout
        }
        am.clear = () => {
            VM.notify("Are you sure you want to clear all metrics, this action is not reversible", "black", {
                proceed: () => {
                    am
                        .metrics
                        .removeAll()
                    redraw()
                }
            }, "clear metrics")
        }
        am.save = () => {
            if (am.totalCompo() != 100) 
                return VM.notify("Total percentage composition must be 100%", "error")
            for (m of am.metrics()) {
                if (_anyEmpty(m.title(), m.label(), m.marks(), m.compo())) 
                    return VM.notify("Do not leave any field on the metrics empty", "error")
                if (m.marks() < 1) 
                    return VM.notify("The least obtainable score on any metric is 1", "error")
                if (m.compo() < 1) 
                    return VM.notify("Negative values not allowed for percentage composition", "error")
            }
            am.updatingMetrics(true)
            sockets.emit('save assessment metrics', ko.toJS(am.metrics()), data => {
                if (!data.status) 
                    VM.notify("Problem saving assessment metrics, could not reach Control Workstation", "error")
                else {
                    if (!data.response) 
                        VM.notify("Unable to save assessment metrics", "error")
                    else 
                        VM.notify("Assessment metrics saved successfully")
                }
                am.updatingMetrics(false)
            })
        }
        am.loadMetrics = () => {
            sockets.emit('fetch setting', 'schoolMetrics', data => {
                if (!data.status) 
                    VM.notify("Unable to fetch assessment metrics, could not reach Control Workstation", "error", {'try again': am.loadMetrics}, 'retry load metrics')
                else {
                    if (data.response) {
                        data
                            .response
                            .map(m => {
                                am
                                    .metrics
                                    .push(new Metric(m))
                            })
                        redraw()
                        am.connected(true)
                    }
                }
            }, true)
        }

        // computed
        am.totalMarks = ko.computed(() => {
            let total = 0
            ko
                .utils
                .arrayForEach(am.metrics(), m => total += parseInt(m.marks() || 0))
            return total
        })
        am.totalCompo = ko.computed(() => {
            let total = 0
            ko
                .utils
                .arrayForEach(am.metrics(), m => total += parseFloat(m.compo() || 0))
            return parseFloat(total).toFixed(2)
        })

        // local
        function Metric() {
            let args = arguments.length > 0
                ? arguments[0]
                : {}
            // props
            this.title = ko.observable(args.title || '') // title
            this.label = ko.observable(args.label || '') // abbreviation
            this.marks = ko.observable(args.marks || null) // marks obtainable
            this.compo = ko.observable(args.compo || null) // percentage composition

            // behaviours
            this.kill = () => {
                am
                    .metrics
                    .remove(this)
                redraw()
            }
        }

        // init
        am.loadMetrics()
    }

    function GradingSystem() {
        let gs = this

        // observables
        gs.grades = ko.observableArray()
        gs.saving = ko.observable(false)
        gs.connected = ko.observable(false)

        // behaviours
        gs.add = (vm, evt) => {
            let gradesCount = gs
                    .grades()
                    .length,
                lastScore = gradesCount >= 1
                    ? gs
                        .grades()[gradesCount - 1]
                        .score() - 5
                    : 100
            lastScore = lastScore < 0
                ? 100
                : lastScore // ensure we'ont have a zero maxScore
            gs
                .grades
                .push(new Grade({maxScore: lastScore}))
            redraw(evt)
        }
        gs.pop = () => {
            gs
                .grades
                .pop()
        }
        gs.save = () => {
            if (gs.grades().length == 0) 
                return VM.notify('Click the `add field` button to add a row.', 'warn')
            else {
                for (let g of gs.grades()) 
                    if (_anyEmpty(g.grade(), g.score())) 
                        return VM.notify('Do not leave any field empty or delete excess rows.', 'warn')

            gs.saving(true)
                sockets.emit('save grading sys', ko.toJS(gs.grades()), data => {
                    if (!data.status) 
                        return VM.notify('Problem updating Grading system, could not reach Control Workstation', 'error', {'try again': vm.saveGradingSys}, 'retry save grading sys')
                    else {
                        if (data.response) {
                            VM.notify('Successfully saved.')
                            gs.saving(false)
                        } else {
                            VM.notify('Unable to save Grading System', 'error')
                            gs.saving(false)
                        }
                    }
                })
            }
        }
        gs.loadGrades = () => {
            sockets.emit('fetch setting', 'gradingSystem', data => {
                if (!data.status) 
                    VM.notify("Unable to fetch grading system, could not reach Control Workstation", "error", {'try again': vm.loadGradingSystem}, 'retry load grading system')
                else {
                    if (data.response) {
                        data
                            .response
                            .map(g => {
                                gs
                                    .grades
                                    .push(new Grade(g))
                            })
                        gs.connected(true)
                        redraw()
                    }
                }
            }, true)
        }

        // local
        function Grade() {
            let g = this
            let args = arguments.length > 0
                ? arguments[0]
                : {}
            // props
            g.id = args.id || gs
                .grades()
                .length
            // observables
            g.grade = ko.observable(args.grade || "")
            g.score = ko.observable(args.score || null)
            g.maxScore = ko.observable(args.maxScore || 100)
            // subscriptions
            g
                .score
                .subscribe(s => {
                    gs
                        .grades()
                        .map((v) => {
                            if (v.id > g.id) 
                                v.maxScore(s - 5)
                        })
                })
        }

        // init
        gs.loadGrades()
    }

    /**
     * Handler for terms per session under the ops & terms section
     * @param {string} val
     * @param {string} name
     */
    function TermsPerSessHandler(val, name) {
        this.val = val
        this.name = name
    }

    // local
    function dimens(max = 800) {
        let el = $('.school-logo')[0]
        var _width = el.width;
        var _height = el.height;

        aspect_ratio = Math.max(_width, _height);
        _width = (_width / aspect_ratio) * max;
        _height = (_height / aspect_ratio) * max;

        return {'w': _width, 'h': _height}
    }
    function offset(dimen, against = 800) {
        let _l = -(dimen.w - against) / 2;
        let _t = -(dimen.h - against) / 2;
        return {'l': _l, 't': _t}
    }
    function redraw() {
        let container = arguments.length == 0
            ? null
            : $(arguments[0].target)
                .closest('.card')
                .find('.content.scrollable')[0]
        _.defer(() => {
            $
                .fn
                .matchHeight
                ._update()
            if (container) {
                $('.school-config-screen').scrollTop(10000)
                $(container).scrollTop(10000)
            }
            _tooltip()
        }) // redraw layout
    }
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

    // init
    _.defer(() => {
        // setup tooltips
        _tooltip()

        // when logo is loaded
        $('.school-logo').on('load', function () {
            // match heights because the profile pic card is the standard
            $('.card').matchHeight({})
            vm.uiVisible(true)
        })

        // set logo src
        fs.exists(USERDATA_ASSETS_PATH + 'logo.jpg', b => {
            if (b) 
                logoUri = `${USERDATA_ASSETS_PATH}logo.jpg?nonce=${VM.nonce}`
            vm.logo(logoUri)
        })

        // load school info
        vm.schoolName(VM.controlVm.schoolName())
        vm.schoolSlogan(VM.controlVm.schoolSlogan)
        vm.schoolAddress(VM.controlVm.schoolAddress)
        vm.schoolDisplaysPositions(VM.controlVm.schoolDisplaysPositions)
        vm.subSession(VM.controlVm.schoolSubSession)
        vm.sessionName(VM.controlVm.schoolSessionName)
        vm.termsPerSession(VM.controlVm.schoolTermsPerSession)
        vm.currentTerm(VM.controlVm.schoolCurrentTerm)

        // confirm logo from server
        let DbSettings = db('settings')
        DbSettings
            .findOne({label: 'logoSalt'})
            .execAsync()
            .then(d => {
                sockets.emit('fetch school logo', {
                    salt: d
                        ? d.value
                        : ''
                }, d => {
                    if (d.status && d.response && d.response.buf) {
                        // buffer returned, meaning logo has changed
                        _saveLogo(d.response)
                    }
                }, true, 10000)
            })
            .catch(() => {})
    })
}

new Component('school-config')
    .def(vm)
    .load()