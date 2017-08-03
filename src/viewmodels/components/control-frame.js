var vm = function (params) {
  let vm = this

  // props
  let menuItems = [
    {
      id: 'home',
      label: 'Home'
    }, {
      id: 'admins',
      label: 'Admin Profiles',
      kind: MENU_ADMIN
    }, {
      component: 'school-config',
      label: 'School Configuration',
      kind: MENU_SUPER
    }, {
      id: 'teachers',
      label: 'Manage Teachers',
      kind: MENU_ADMIN
    }, {
      id: 'subjects',
      label: 'Manage Subjects',
      kind: MENU_ADMIN
    }, {
      id: 'classes',
      label: 'Manage Classes',
      kind: MENU_ADMIN
    }, {
      id: 'feedbacks',
      label: 'Feedback',
      kind: MENU_SUPER
    }, {
      id: 'classteacher',
      label: 'Manage Class',
      kind: MENU_CLASSTEACHER
    }, {
      label: 'Logout',
      action: VM.logout
    }
  ]
  vm.schoolUid = '' // what the school uid is
  vm.personId = '' // what the logged in person's _id is
  vm.schoolSlogan = '' // slogan of the school
  vm.schoolAddress = '' // address of the school
  vm.schoolDisplaysPositions = false // does the school display students' positions
  vm.schoolSubSession = 'term' // what they call subsessions in this school
  vm.schoolSessionName = '' // what session the school is in currently
  vm.schoolTermsPerSession = null // how many terms per session
  vm.schoolCurrentTerm = null // what term the school's in
  vm.schoolPromotionCutoff = null // promotion cutoff used in the school

  // observables
  vm.menu = ko.observableArray() // all menu items (built)
  vm.schoolName = ko.observable() // what school is this
  vm.personName = ko.observable() // who's currently logged in
  vm.personEmail = ko.observable() // email address of currently logged in guy
  vm.teacherPass = ko.observable() // teacher password
  vm.teacherConfPass = ko.observable() // confirm teacher password
  vm.superAdmin = ko.observable(false) // tells if logged in guy is superadmin
  vm.shouldUpdateProfile = ko.observable(false) // edit profile?
  vm.updatingProfile = ko.observable(false) // profile update in progress
  vm.isEditEmail = ko.observable(false) // should admin update email? Make an API request
  vm.editPrompt = ko.observable("Click to edit profile")

  // time
  vm.disconnectionTime = ko.observable() // what time the connecion the server was lost
  vm.serverTime = ko.observable() // server time received on socket connection
  vm.timeOffset = 0 // the time offset for bubble-wrapper

  // behaviours
  vm.nextMenu = (backwards = false) => {
    let v = VM.view()
    let menu = vm.getMenu()
    let cur = menu.indexOf(menu.find(m => {
      return m.component == v
    }))
    let nxt = backwards
      ? (cur == 0
        ? menu.length - 1
        : cur - 1)
      : (cur == menu.length - 1
        ? 0
        : cur + 1)
    VM.loadView(menu[nxt].component)
  }
  vm.isTeacher = () => {
    return VM.ROLE() && VM
      .ROLE()
      .indexOf('TEACHER') >= 0
  }
  vm.toggleEditPane = () => {
    vm.shouldUpdateProfile(!vm.shouldUpdateProfile())
    vm.editPrompt(vm.shouldUpdateProfile()
      ? "Click to hide edit pane"
      : "Click to edit profile")
    _tooltip();
  }
  vm.editProfile = () => {
    if (vm.updatingProfile()) // quit if profile update is in progress
      return
    if (_anyEmpty(vm.personName(), vm.personEmail())) // no field can be empty
      return VM.notify("No field can be empty", 'warn'),
      null

    vm.updatingProfile(true) // processing has begun
    if (vm.personEmail() !== VM.controlVm.personEmail()) 
      return isEditEmail(true)
    if (vm.isTeacher()) { // if the VM.role === teacher
      if (_anyEmpty(vm.teacherPass(), vm.teacherConfPass()) || vm.teacherPass() !== vm.teacherConfPass()) 
        return vm.updatingProfile(false),
        VM.notify('Enter your password and ensure they match', 'warn')
      sockets.emit('edit teacher', {
        name: vm.personName(),
        email: vm.personEmail(),
        password: vm.teacherPass()
      }, (data) => {
        if (!data.status) 
          return VM.notify('Problem editing teacher, could not reach Control Workstation', 'error', {
            'try again': vm.editProfile()
          }, 'retry edit teacher\'s profile')
        else {
          if (data.response) {
            VM
              .controlVm
              .personName(data.response.name)
            if (vm.isEditEmail()) {
              VM
                .controlVm
                .personEmail(data.response.email)
              vm.isEditEmail(false)
            }
            VM.notify("Profile update successful")
            vm.shouldUpdateProfile(false)
            vm.updatingProfile(false)
          } else 
            VM.notify("Unable to update profile", "error")
          vm.shouldUpdateProfile(false)
          vm.updatingProfile(false)
        }
      })
    } else { // everyone else except teacher
      if (vm.personEmail() !== VM.controlVm.personEmail()) 
        return isEditEmail(true)
      sockets.emit('update profile', { // send to the socket ( update profile )
        'name': vm.personName(),
        '_id': VM.controlVm.personId
      }, (data) => { // response
        if (!data.status) { // no response really
          VM.notify("Profile update failed, no reponse from Control Workstation", "error")
          vm.updatingProfile(false)
        } else {
          if (data.response) { // name update successful
            function proceed(data) {
              // every local function to invoke for updating the name everywhere
              VM
                .controlVm
                .personName(data.name)
              if (vm.isEditEmail()) {
                VM
                  .controlVm
                  .personEmail(data.email)
                vm.isEditEmail(false)
              }
              VM.notify("Profile update successful")
              vm.shouldUpdateProfile(false)
              vm.updatingProfile(false)
            }
            if (vm.isEditEmail()) { // do an api call
              let updateData = {
                uid: VM.controlVm.schoolUid,
                email: vm.personEmail()
              }
              api
                .p('school/update-email', updateData)
                .then(data => {
                  data = data.data
                  if (!data.status) 
                    VM.notify(data.msg, 'error');
                  
                  sockets.emit('update profile', { // send to the socket ( update profile )
                    'email': vm.profileEmail(),
                    '_id': VM.controlVm.personId
                  }, data => {
                    if (!data.status) { // no response really
                      VM.notify("Error occured, email left unchanged", "warn")
                      vm.updatingProfile(false)
                    } else {
                      if (!data.response) {
                        VM.notify("Error occured, email left unchanged", "warn")
                        vm.updatingProfile(false)
                      } else 
                        proceed(data.response)
                    }
                  })
                })
                .catch(err => {
                  VM.notify('Unable to reach authentication servers, check your network connection. Email lef' +
                      't unchanged',
                  'warn', {'try again': vm.editProfile})
                  vm.updatingProfile(false)
                })
            } else 
              proceed(data.response)
          } else {
            VM.notify("Profile update failed", "warn")
            vm.updatingProfile(false)
          }
        }
      })

    }
  }

  // computed
  vm.isServer = ko.computed(() => {
    return VM.MODE() == SERVER
  })
  vm.ipTooltip = ko.computed(() => {
    if (!VM.connectionInfo()) 
      return;
    return vm.isServer()
      ? (VM.IP() != '127.0.0.1'
        ? `Other workstations in your institution can connect to this server via this address: ${VM.IP()}`
        : 'System running in solo mode, no client can connect because you\'re not on a netw' +
          'ork')
      : `You are currently${ !VM
        .connectionInfo()
        .connected()
        ? ' NOT'
        : ''} connected to the Control Workstation at ${VM.IP()}`
  })
  vm.getMenu = ko.computed(() => {
    let m = []
    vm
      .menu()
      .map(menu => {
        let skip = ((menu.kind == MENU_TEACHER || menu.kind == MENU_CLASSTEACHER) && !vm.isTeacher())/* only teachers see what only teachers should see */ || (!vm.superAdmin() && menu.kind == MENU_SUPER)/* only superadmin sees what only superadmin should see */ || (vm.isTeacher() && menu.kind == MENU_ADMIN)/* teachers cannot see what belongs to the admins */
        if (skip) 
          return
        m.push(menu)
      })
    return m
  })

  // subscriptions
  VM
    .ROLE
    .subscribe(() => _.defer(() => {
      _tooltip(),
      ajs()
    }))
  vm
    .ipTooltip
    .subscribe(() => _tooltip())
  vm
    .schoolName
    .subscribe(s => currentWindow.setTitle(`Digischools • ${s}`))
  vm
    .superAdmin
    .subscribe(b => {
      if (b) 
        sockets.emit('request elevation', vm.personEmail(), d => {}, true)
    })
  vm
    .serverTime
    .subscribe(t => {
      vm.timeOffset = t - _getUTCTime(),
      console.log(vm.timeOffset)
    })

  // sub vm
  function MenuItem(config) {
    if (!config.label) 
      return;
    let m = this

    // observables
    m.id = config.id || config.component || config.label
    m.label = config.label || ' '
    m.component = config.component || m.id + '-screen'
    m.kind = config.kind || MENU_GLOBAL
    m.action = config.action || null

    // behaviours
    m.go = () => {
      if (m.action) 
        return m.action(),
        null
      if (m.component == VM.view()) 
        return
      VM.loadView(m.component)
    }

    // computed
    m.isActive = ko.computed(() => {
      return m.component == VM.view()
    })
    m.icon = ko.computed(() => {
      return `resx/icons/${m
        .id}${m
        .isActive()
        ? '-inv'
        : ''}.png`
    })
  }

  // init
  VM.controlVm = vm
  // load up menu
  menuItems.map(m => vm.menu.push(new MenuItem(m)))
  _.defer(() => {
    $('control-frame').append("<script src='./imports/ext/tooltip.min.js'></script>")
    tooltip.setOptions({offsetDefault: 10})
  })
  // bind Ctrl+tab to navigate between tabs
  document.addEventListener("keydown", function (e) {
    if (VM.ROLE()) 
      if (e.which === 9 && e.ctrlKey) 
        vm.nextMenu(e.shiftKey)
  })
}

new Component('control-frame')
  .def(vm)
  .load()