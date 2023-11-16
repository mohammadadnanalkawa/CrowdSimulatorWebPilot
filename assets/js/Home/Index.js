var map;
var scenario;
var markers = [];
var curSecond = parseInt(0);
var canAnimate = false;
var rectangle;

var image = 'person.png';
var area = null;
var obstacles = [];
var locationMap = '';
var drawingManager = '';



function initMap() {
    map = new google.maps.Map(document.getElementById('divMap'), {
        zoom: 20,
        //center: { lat: 21.38009, lng: 39.80861 },
        mapTypeId: 'terrain'
    });

    locationMap = new google.maps.Map(document.getElementById('locationMap'), {
        center: { lat: 21.38009, lng: 39.80861 },
        zoom: 12
    });

    drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.MARKER,
        drawingControl: true,
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: ['rectangle']
        }

    });
    drawingManager.setMap(locationMap);
    drawingManager.setDrawingMode('rectangle');


    google.maps.event.addListener(drawingManager, 'polygoncomplete', function(polygon) {
        var p = polygon;
        p.type = 'POLYGON';
        p.setOptions({
            trokeColor: '#ff1111',
            strokeOpacity: 0.6,
            strokeWeight: 1,
            fillColor: '#aa2200',
            fillOpacity: 0.40,
        });
        p.setEditable(true);
        p.addListener("rightclick", function() {
            p.setMap(null);
        });
        obstacles.push(p);
        drawingManager.setDrawingMode(null);
    });

    google.maps.event.addListener(drawingManager, 'rectanglecomplete', function(rectangle) {
        if (area != null) area.setMap(null);
        area = rectangle;
        area.type = 'RECTANGLE';
        area.setEditable(true);

        drawingManager.setOptions({
            drawingControlOptions: {
                //drawingModes: ['marker', 'circle', 'polygon', 'polyline', 'rectangle']
                drawingModes: ['polygon']
            }
        });
        drawingManager.setDrawingMode('polygon');
        area.addListener("rightclick", function() {
            if (area != '') area.setMap(null);
            drawingManager.setDrawingMode('rectangle');
        });
        area.setOptions({
            strokeColor: '#11aa11',
            strokeOpacity: 0.3,
            strokeWeight: 1,
            fillColor: '#224422',
            fillOpacity: 0.20,
        });
    });
}

function setValues(observer) {
    //return;
    observer
    scenario = observer.scenario;

    $('#NumberOfPersons').val(scenario.people);
    $('#TimeInSeconds').val(scenario.duration);
    $('#CaseName').val(scenario.caseName);
    $('#GroupsCount').val(scenario.groups.length);
    $('#NumberOfPeriods').val(scenario.periods);
    IO.OUT(scenario.data, locationMap)
    drawingManager.setMap(null);


    BuildPeriodsTable(scenario);
    var rows = scenario.periods * scenario.groups.length;
    var index = 0;
    for (var g = 0; g < scenario.groups.length; g++) {
        var group = scenario.groups[g];
        for (var period = 1; period < group.periods.length; period++) {
            $('#Speed' + index).val(group.periods[period].speed);
            $('#Heading' + index).val(Math.round(toDegrees(group.periods[period].angle)));
            $('#Deviation' + index).val(group.periods[period].deviation);
            index++;
        }
    }
    BuildResultsTable(observer);
    curSecond = parseInt(0);
    canAnimate = false;
    initMarkers();
}

$(document).ready(function() {

    $('[data-mask]').inputmask();
    $('.select2').select2();

    // Toolbar extra buttons
    var btnFinish = $('<button></button>').text('Finish')
        .addClass('btn btn-info disabled btn-finish')
        .on('click', function() {
            if (!$(this).hasClass('disabled')) {
                //return false;
                var elmForm = $("#ModelForm");
                if (elmForm) {
                    elmForm.validator('validate');
                    var elmErr = elmForm.find('.has-error');
                    if (elmErr && elmErr.length > 0) {
                        swal('Please complete all periods');
                        return false;
                    } else {
                        GenerateData();
                        return false;
                    }
                }
            } else
                return false;
        });

    var btnCancel = $('<button></button>').text('Cancel')
        .addClass('btn btn-danger')
        .on('click', function() {
            $('#smartwizard').smartWizard("reset");
            $('#ModelForm').find("input, textarea").val("");
        });

    // Smart Wizard
    $('#smartwizard').smartWizard({
        selected: 0,
        theme: 'dots',
        transitionEffect: 'fade',
        showStepURLhash: false,
        toolbarSettings: {
            toolbarPosition: 'both',
            toolbarExtraButtons: [btnFinish, btnCancel]
        },
        anchorSettings: {
            markDoneStep: true, // add done css
            markAllPreviousStepsAsDone: true, // When a step selected by url hash, all previous steps are marked done
            removeDoneStepOnNavigateBack: false, // While navigate back done step after active step will be cleared
            enableAnchorOnDoneStep: true // Enable/Disable the done steps navigation
        }
    });

    $("#smartwizard").on("leaveStep", function(e, anchorObject, stepNumber, stepDirection) {
        var elmForm = $("#form-step-" + stepNumber);
        // stepDirection === 'forward' :- this condition allows to do the form validation
        // only on forward navigation, that makes easy navigation on backwards still do the validation when going next
        if (stepDirection === 'forward' && elmForm) {
            elmForm.validator('validate');
            var elmErr = elmForm.children('.has-error');
            if (elmErr && elmErr.length > 0) {
                // Form validation failed
                return false;
            }
        }
        return true;
    });

    // Initialize the beginReset event
    $("#smartwizard").on("beginReset", function(e) {
        return confirm("Do you want to clear all data?");
    });

    $("#smartwizard").on("showStep", function(e, anchorObject, stepNumber, stepDirection) {
        // Enable finish button only on last step
        if (stepNumber === 2) {
            $('.btn-finish').removeClass('disabled');
        } else {
            if (scenario != null) $('.btn-finish').addClass('disabled');
        }
    });
});

function BuildSpeedSelect(i, l) {
    var h = "";
    var s = "";
    var v = [0, 0.25, 0.50, 0.75, 1.00, 1.25, 1.50];
    h += '      <select required class="form-control select2" style="width: 100%;" id="Speed' + i + '">'
    for (var vs = 0; vs < v.length; vs++) {
        var ss = (v[vs] == 0) ? 'Stop' : v[vs];
        s = (l == v[vs]) ? '<option value="' + v[vs] + '" selected="selected">' + ss + '</option>' : '<option value="' + v[vs] + '">' + ss + '</option>';
        h += s;
    }
    h += '      </select>'
    return h;
}

function BuildPeriodsTable(scenario) {
    var groups = (typeof(scenario) == "undefined") ? $('#GroupsCount').val() : scenario.groups.length;

    var thead = '';
    thead += '<thead>';
    thead += '<tr>';
    thead += '<th>Group</th>';
    thead += '<th>Period</th>';
    thead += '<th>Speed (M/S)</th>';
    thead += '<th>Heading</th>';
    thead += '<th>Deviation (+/-)</th>';
    thead += '</tr>';
    thead += '</thead>';

    var tbody = '';
    tbody += '<tbody>';
    for (var g = 0; g < groups; g++) {
        var periods = (typeof(scenario) == "undefined") ? $('#NumberOfPeriods').val() : (scenario.groups[g].periods.length - 1);
        for (var p = 0; p < periods; p++) {
            tbody += '<tr>';
            tbody += '<td> Group ' + (g + 1) + '</td>';
            tbody += '<td> Period ' + (p + 1) + '</td>';
            i = g * periods + p;
            var s = (typeof(scenario) == "undefined") ? '<td>' + BuildSpeedSelect(i, 0) + '</td>' : '<td>' + BuildSpeedSelect(i, scenario.groups[g].periods[(p + 1)].speed) + '</td>';
            tbody += s;
            tbody += '<td>' + '<input required type="text" class="form-control" data-inputmask="\'alias\': \'decimal\', \'rightAlign\':false" data-mask id="Heading' + i + '">' + '</td>';
            tbody += '<td>' + '<input required type="text" class="form-control" data-inputmask="\'alias\': \'decimal\', \'rightAlign\':false" data-mask id="Deviation' + i + '">' + '</td>';
            tbody += '</tr>';
        }
    }
    tbody += '</tbody>';


    var tfoot = '';

    var t = thead + tbody + tfoot
    $('#PeriodsTable').html(t);
    $('[data-mask]').inputmask();
    $('.select2').select2();

}

var GenerateData = function() {

    CaseName = $('#CaseName').val();
    GroupsCount = $('#GroupsCount').val();
    NumberOfPersons = $('#NumberOfPersons').val();
    TimeInSeconds = $('#TimeInSeconds').val();
    NumberOfPeriods = $('#NumberOfPeriods').val();
    scenario = new Scenario(CaseName, TimeInSeconds, NumberOfPeriods, NumberOfPersons);
    var peopleInGroupM = NumberOfPersons % GroupsCount;
    var peopleInGroup = (NumberOfPersons - peopleInGroupM) / GroupsCount;

    for (g = 0; g < GroupsCount; g++) {
        group = (g == 0) ? new Group(peopleInGroup + peopleInGroupM) : new Group(peopleInGroup);
        for (p = 0; p < NumberOfPeriods; p++) {
            id = g * NumberOfPeriods + p;
            group.addPeriod(
                $('#Speed' + id).val(),
                toRadians($('#Heading' + id).val()),
                $('#Deviation' + id).val()
            );
        }
        scenario.addGroup(group);
    }

    observer = new Observer(scenario);

    BuildResultsTable(observer);
    curSecond = parseInt(0);
    canAnimate = false;
    initMarkers();


}

function BuildResultsTable(observer) {

    var thead = '';
    thead += '<thead>';
    thead += '<tr>';
    thead += '<th>Serial</th>';
    thead += '<th>CaseName</th>';
    thead += '<th>PersonID</th>';
    thead += '<th>Latitude</th>';
    thead += '<th>Longitude</th>';
    thead += '<th>Speed</th>';
    thead += '<th>PeriodID</th>';
    thead += '<th>Second</th>';

    thead += '<th>Heading</th>';

    thead += '<th>Point1Lat</th>';
    thead += '<th>Point1Lng</th>';
    thead += '<th>Point2Lat</th>';
    thead += '<th>Point2Lng</th>';
    thead += '<th>Point3Lat</th>';
    thead += '<th>Point3Lng</th>';
    thead += '<th>Point4Lat</th>';
    thead += '<th>Point4Lng</th>';

    thead += '</tr>';
    thead += '</thead>';

    var tbody = '';
    tbody += '<tbody>'; /****$$$ */
    for (var i = 0; i < observer.registers.length; i++) {
        record = observer.registers[i]
        tbody += '<tr>';
        tbody += '<td>' + record.serial + '</td>';
        tbody += '<td>' + observer.scenario.caseName + '</td>';
        tbody += '<td>' + record.id + '</td>';
        tbody += '<td>' + record.latitude + '</td>';
        tbody += '<td>' + record.longitude + '</td>';
        tbody += '<td>' + record.speed + '</td>';
        tbody += '<td>' + record.period + '</td>';
        tbody += '<td>' + record.second + '</td>';

        tbody += '<td>' + record.heading + '</td>';

        tbody += '<td>' + area.getBounds()["Ua"]["j"] + '</td>';
        tbody += '<td>' + area.getBounds()["Ua"]["i"] + '</td>';
        tbody += '<td>' + area.getBounds()["Ua"]["j"] + '</td>';
        tbody += '<td>' + area.getBounds()["Ya"]["i"] + '</td>';
        tbody += '<td>' + area.getBounds()["Ya"]["j"] + '</td>';
        tbody += '<td>' + area.getBounds()["Ua"]["i"] + '</td>';
        tbody += '<td>' + area.getBounds()["Ya"]["j"] + '</td>';
        tbody += '<td>' + area.getBounds()["Ya"]["i"] + '</td>';

        tbody += '</tr>';
    }
    tbody += '</tbody>';


    var tfoot = '';

    var t = thead + tbody + tfoot
    $('#ResultsTable').html(t);
    ConfigDT();
}

var ConfigDT = function() {
    var displayTable = $('#ResultsTable').DataTable({
        bDestroy: true,
        //'columnDefs': [{
        //  'orderable': false,
        //  targets: 0
        //}],
        select: {
            style: 'multi',
            selector: 'td:first-child'
        },
        responsive: true,
        ordering: true,
        dom: 'Bfrtip',
        lengthMenu: [
            [10, 25, 50, -1],
            ['10 rows', '25 rows', '50 rows', 'Show all']
        ],
        buttons: [
            'pageLength',
            {
                extend: 'colvis',
                text: 'Columns'
            },
            {
                extend: 'collection',
                text: 'Export Data',
                buttons: [
                    'copyHtml5',
                    'excelHtml5',
                    'csvHtml5',
                ],

            }
        ],
        'order': [0, 'asc']
    });
}



var initMarkers = function() {

    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers = [];


    const Model0 = observer.registers.filter(Model => Model.second === 0);

    for (var i = 0; i < Model0.length; i++) {
        var marker = new google.maps.Marker({
            map: locationMap,
            position: { lat: Model0[i].latitude, lng: Model0[i].longitude },
            icon: image,
        })
        markers.push(marker);
    }

}

function AnimateMarkers() {

    if (!canAnimate) {
        curSecond = parseInt(0);
        return;
    }
    const Model0 = observer.registers.filter(Model => Model.second === curSecond);

    console.log(curSecond);

    for (var i = 0; i < markers.length; i++) {
        var marker = markers[i];
        marker.setPosition({ lat: Model0[i].latitude, lng: Model0[i].longitude });
        marker.setMap(locationMap);
    }


    // do whatever you like here
    var AllSeconds = scenario.groups[0].duration * scenario.groups[0].periods.length - 1;
    curSecond += 1;

    if (curSecond > AllSeconds) {
        canAnimate = false;
        curSecond = parseInt(0);
        return;
    }
    setTimeout(AnimateMarkers, 1000);
}

function doAnimate() {
    if (!canAnimate) {
        canAnimate = true;
        AnimateMarkers();
    }

}



/**************************************************************/
/*New Meta*/

class Point {
    constructor(long, lat) {
        this.longitude = long;
        this.latitude = lat;
    }

    latlong() {
        return new google.maps.LatLng(this.latitude, this.longitude);
    }
}

function masterPoint1() {
    return new Point(area.getBounds()['Ua']['i'], area.getBounds()['Ya']['j']);;
}

function masterPoint2() {
    return new Point(area.getBounds()['Ua']['j'], area.getBounds()['Ya']['i']);
}

function randomPoint() {
    var p1 = masterPoint1();
    var p2 = masterPoint2();
    var p = new Point(getRnd(p1.longitude, p2.longitude), getRnd(p1.latitude, p2.latitude));
    obstacles.forEach(function(o, i) {
        if (google.maps.geometry.poly.containsLocation(p.latlong(), o)) {
            p = randomPoint();
        }
    });
    return p;
}

class Person {
    constructor(point, angle, speed) {
        this.point = point;
        this.movmentAngle = angle;
        this.speed = speed;
    }
    move() {
        move(this, 0);
    }
    update(speed, angle) {
        this.speed = speed;
        this.angle = angle;
    }
}

function move(person, addeddev) {
    var disCo = new displacmentCoordination(person.speed, person.angle + addeddev);
    var nextP = new Point(person.point.longitude + mToLong(disCo.y, person.point.latitude), person.point.latitude + mToLat(disCo.x));
    while (noSafe(nextP)) {
        addeddev += 5;
        disCo = new displacmentCoordination(person.speed, person.angle + addeddev);
        nextP = new Point(person.point.longitude + mToLong(disCo.y, person.point.latitude), person.point.latitude + mToLat(disCo.x));
    }
    person.point = nextP;
}

function noSafe(point) {
    r = false;
    obstacles.forEach(function(o, i) {
        if (google.maps.geometry.poly.containsLocation(point.latlong(), o)) r = true;
    });
    return r;
}

class Record {
    constructor(serial, id, point, speed, period, second, heading) {
        this.serial = serial;
        this.id = id;
        this.latitude = point.latitude;
        this.longitude = point.longitude;
        this.speed = speed;
        this.period = period;
        this.second = second;
        this.heading = heading;
    }
}

class Observer {
    constructor(scenario) {
        this.scenario = scenario;
        this.registers = [];
        var groups = scenario.groups.length;

        var periods = scenario.periods * 1 + 1;
        this.secondsM = scenario.duration % scenario.periods;
        var secondsN = (scenario.duration - this.secondsM) / scenario.periods;
        var serial = 1;
        var s = 0;
        for (var period = 0; period < periods; period++) {
            var seconds = (period == 0) ? 1 : (period == 1) ? secondsN + this.secondsM : secondsN;
            for (var second = 0; second < seconds; second++) {
                var id = 1;
                for (var group = 0; group < groups; group++) {
                    var people = scenario.groups[group].people.length;
                    scenario.groups[group].setPeriod(period);
                    for (var person = 0; person < people; person++) {
                        var p = scenario.groups[group].people[person];
                        this.registers.push(new Record(serial, id, p.point, p.speed, period, s, p.angle));
                        p.move();
                        id++;
                        serial++;
                    }
                }
                s++;
            }
        }
    }
}

class Scenario {
    constructor(name, duration, periods, people) {
        this.caseName = name;
        var shapes = [];
        shapes.push(area);
        obstacles.forEach(function(o, i) {
            shapes.push(o);
        })
        this.data = IO.IN(shapes, false);
        this.duration = duration;
        this.periods = periods;
        this.people = people;
        this.groups = [];
    }
    addGroup(group) {
        this.groups.push(group);
    }
}

class Group {
    constructor(people) {
        this.people = [];
        for (i = 0; i < people; i++) {
            this.people.push(new Person(randomPoint(), 0, 0));
        }
        this.periods = [];
        this.periodIndex = 0;
        this.addPeriod(0, 0, 0);
    }

    addPeriod(speed, angle, deviation) {
        this.periods.push(new Period(speed, angle, deviation));
    }

    setPeriod(period) {
        var p = this.periods[period];
        var sdr = p.speed * p.deviation / 100;
        var adr = p.angle * p.deviation / 100;
        this.people.forEach(function(item, index) {
            item.speed = p.speed * 1 + sdr * getRnd(-1, 1);
            item.angle = p.angle * 1 + adr * getRnd(-1, 1);
        });
    }
}

class Period {
    constructor(speed, angle, deviation) {
        this.speed = speed;
        this.angle = angle;
        this.deviation = deviation;
    }
}



/**Math */
function mToLat(meter) {
    return meter / 111320;
}

function mToLong(meter, lat) {
    return (meter * Math.cos(lat) / 360) / (40075 * Math.cos(lat) / 360)
}

function toDegrees(angle) {
    return angle * (180 / Math.PI);
}

function toRadians(angle) {
    return angle * (Math.PI / 180);
}

class displacmentCoordination {
    constructor(displacment, angle) {
        this.y = displacment * Math.sin(angle);
        this.x = displacment * Math.cos(angle);
    }
}

function getRnd(n1, n2) {
    if (n1 > n2) {
        var min = n2;
        var max = n1;
    } else {
        var min = n1;
        var max = n2;
    }
    return (Math.random()).toFixed(2) * (max - min) + min * 1;
}


/**Util */

function save() {
    DownloadCase(JSON.stringify(observer), observer.scenario.caseName + '.json', 'text/plain');
}

function DownloadCase(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

function load() {
    var f = document.createElement('input');
    f.style.display = 'none';
    f.type = 'file';
    f.name = 'file';
    f.accept = ".json";
    f.addEventListener('change', (event) => {
        file = f.files[0];
        fr = new FileReader();
        fr.onload = readFile;
        fr.readAsText(file);

    });
    f.click();

};

function readFile(e) {
    let lines = e.target.result;
    observer = JSON.parse(lines);
    setValues(observer);
}

var IO = {
    //returns array with storable google.maps.Overlay-definitions
    IN: function(arr, //array with google.maps.Overlays
        encoded //boolean indicating whether pathes should be stored encoded
    ) {
        var shapes = [],
            goo = google.maps,
            shape, tmp;

        for (var i = 0; i < arr.length; i++) {
            shape = arr[i];
            tmp = { type: shape.type, id: shape.id || null };


            switch (tmp.type) {
                case 'RECTANGLE':
                    tmp.geometry = this.b_(shape.getBounds());
                    break;
                case 'POLYGON':
                    tmp.geometry = this.m_(shape.getPaths(), encoded);

                    break;
            }
            shapes.push(tmp);
        }

        return shapes;
    },
    //returns array with google.maps.Overlays
    OUT: function(arr, //array containg the stored shape-definitions
        map //map where to draw the shapes
    ) {
        var shapes = [],
            goo = google.maps,
            map = map || null,
            shape, tmp;

        for (var i = 0; i < arr.length; i++) {
            shape = arr[i];

            switch (shape.type) {
                case 'RECTANGLE':
                    tmp = new goo.Rectangle({ bounds: this.bb_.apply(this, shape.geometry) });
                    tmp.setOptions({
                        strokeColor: '#11aa11',
                        strokeOpacity: 0.3,
                        strokeWeight: 1,
                        fillColor: '#224422',
                        fillOpacity: 0.20,
                    });
                    area = tmp;
                    break;
                case 'POLYGON':
                    tmp = new goo.Polygon({ paths: this.mm_(shape.geometry) });
                    tmp.setOptions({
                        trokeColor: '#ff1111',
                        strokeOpacity: 0.6,
                        strokeWeight: 1,
                        fillColor: '#aa2200',
                        fillOpacity: 0.40,
                    });
                    obstacles.push(tmp);
                    break;
            }
            tmp.setValues({ map: map, id: shape.id })
            shapes.push(tmp);
        }
        return shapes;
    },
    l_: function(path, e) {
        path = (path.getArray) ? path.getArray() : path;
        if (e) {
            return google.maps.geometry.encoding.encodePath(path);
        } else {
            var r = [];
            for (var i = 0; i < path.length; ++i) {
                r.push(this.p_(path[i]));
            }
            return r;
        }
    },
    ll_: function(path) {
        if (typeof path === 'string') {
            return google.maps.geometry.encoding.decodePath(path);
        } else {
            var r = [];
            for (var i = 0; i < path.length; ++i) {
                r.push(this.pp_.apply(this, path[i]));
            }
            return r;
        }
    },

    m_: function(paths, e) {
        var r = [];
        paths = (paths.getArray) ? paths.getArray() : paths;
        for (var i = 0; i < paths.length; ++i) {
            r.push(this.l_(paths[i], e));
        }
        return r;
    },
    mm_: function(paths) {
        var r = [];
        for (var i = 0; i < paths.length; ++i) {
            r.push(this.ll_.call(this, paths[i]));

        }
        return r;
    },
    p_: function(latLng) {
        return ([latLng.lat(), latLng.lng()]);
    },
    pp_: function(lat, lng) {
        return new google.maps.LatLng(lat, lng);
    },
    b_: function(bounds) {
        return ([this.p_(bounds.getSouthWest()),
            this.p_(bounds.getNorthEast())
        ]);
    },
    bb_: function(sw, ne) {
        return new google.maps.LatLngBounds(this.pp_.apply(this, sw),
            this.pp_.apply(this, ne));
    },
    t_: function(s) {
        var t = ['CIRCLE', 'MARKER', 'RECTANGLE', 'POLYLINE', 'POLYGON'];
        for (var i = 0; i < t.length; ++i) {
            if (s === google.maps.drawing.OverlayType[t[i]]) {
                return t[i];
            }
        }
    }

}