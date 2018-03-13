// modified from https://purecss.io/layouts/side-menu/
(function (window, document) {

    var layout   = document.getElementById('layout'),
        menu     = document.getElementById('menu'),
        menuLink = document.getElementById('menuLink'),
        content  = document.getElementById('main');

    function toggleClass(element, className, force) {
        var classes = element.className.split(/\s+/),
            length = classes.length,
            i = 0;

        for(; i < length; i++) {
            if (classes[i] === className) {
                if (force === false || force === undefined) {
                    classes.splice(i, 1);
                }
                break;
            }
        }
        // The className is not found
        if (length === classes.length) {
            if (force === true || force === undefined) {
                classes.push(className);
            }
        }

        element.className = classes.join(' ');
    }

    function toggleAll(force) {
        var active = 'active';

        toggleClass(layout, active, force);
        toggleClass(menu, active, force);
        toggleClass(menuLink, active, force);
    }

    menuLink.onclick = function (e) {
        e.preventDefault();
        toggleAll();
    };

    content.onclick = function(e) {
        if (menu.className.indexOf('active') !== -1) {
            e.preventDefault();
            toggleAll();
        }
    };

    var menuItems = document.getElementsByClassName("pure-menu-item");
    for (var i = 0; i < menuItems.length; i++) {
        if (menuItems[i].addEventListener) {
            menuItems[i].addEventListener("click", function(e) {
                e.preventDefault();
                toggleAll(false);
                document.location.href = e.target.href;
                setTimeout(function(){
                  document.location.href = e.target.href;
                },250);
            });
        }
    }


}(this, this.document));
