var vm = function (params) {
    let vm = this

    // props
    let logoUri = DEFAULT_SCHOOL_LOGO

    // school profile
    vm.logo = ko.observable()
    vm.schoolName = ko.observable()
    vm.schoolSlogan = ko.observable()
    vm.schoolAddress = ko.observable()
    vm.schoolDisplaysPositions = ko.observable()

    // ops & terminology
    vm.subSession = ko.observable()
    vm.sessionName = ko.observable()
    vm.termsPerSession = ko.observable()
    vm.currentTerm = ko.observable()

    // states
    vm.logoChanged = ko.observable(false)
    vm.uiVisible = ko.observable(false)
    vm.uploadingLogo = ko.observable(false)
    vm.updatingProfile = ko.observable(false)

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
        let DbSettings = db('settings')
        DbSettings.iu([
            {
                label: 'schoolName',
                value: vm.schoolName()
            }, {
                label: 'schoolSlogan',
                value: vm.schoolSlogan()
            }, {
                label: 'schoolAddress',
                value: vm.schoolAddress()
            }, {
                label: 'schoolDisplaysPositions',
                value: vm.schoolDisplaysPositions()
            }
        ]).then(d => {
            VM.controlVm.schoolName(vm.schoolName())
            VM.controlVm.schoolSlogan = vm.schoolSlogan()
            VM.controlVm.schoolAddress = vm.schoolAddress()
            VM.controlVm.schoolDisplaysPositions = vm.schoolDisplaysPositions()

            VM.notify("Profile updated successfully")
            vm.updatingProfile(false)
        }).catch(e => {
            VM.notify("Unable to update school profile", "error")
            vm.updatingProfile(false)
        })
    }

    // subscription
    vm
        .logoChanged
        .subscribe(b => {
            if (b) 
                _.defer(() => tooltip.refresh())
        })

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

    // init
    _.defer(() => {
        // when logo is loaded
        $('.school-logo')
            .on('load', function () {
                // match heights because the profile pic card is the standard
                $('.card').matchHeight()
                vm.uiVisible(true)
            })

        // set logo src
        fs.exists(USERDATA_ASSETS_PATH + 'logo.jpg', b => {
            if (b) 
                logoUri = USERDATA_ASSETS_PATH + 'logo.jpg'
            vm.logo(logoUri)
        })

        // load school info
        vm.schoolName(VM.controlVm.schoolName())
        vm.schoolSlogan(VM.controlVm.schoolSlogan)
        vm.schoolAddress(VM.controlVm.schoolAddress)
        vm.schoolDisplaysPositions(VM.controlVm.schoolDisplaysPositions)

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
                    console.log('Logo fetched', d)
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