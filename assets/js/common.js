var ApiUrl = 'http://localhost/Movment/';

function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
  var expires = "expires=" + d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function deleteCookie(cname) {
  setCookie(cname, "", -1);
};

function IsNullOrEmpty(value) {
  var isNullOrEmpty = true;
  if (value) {
    if ((typeof (value) == 'string')) {
      if (value.length > 0)
      {
        isNullOrEmpty = false;
      }

    }
  }
  return isNullOrEmpty;
}

var getUrlParameter = function getUrlParameter(sParam) {
  var sPageURL = decodeURIComponent(window.location.search.substring(1)),
    sURLVariables = sPageURL.split('&'),
    sParameterName,
    i;

  for (i = 0; i < sURLVariables.length; i++) {
    sParameterName = sURLVariables[i].split('=');

    if (sParameterName[0] === sParam) {
      return sParameterName[1] === undefined ? true : sParameterName[1];
    }
  }
};


function AjaxControl() {

  $(document).ajaxStart(function () {
    $.LoadingOverlay("show");
  });

  $(document).ajaxComplete(function (event, xhr, settings) {
    //do any thing here
    $.LoadingOverlay("hide");
  });

  $(document).ajaxStop(function () {
    $.LoadingOverlay("hide");
  });

}

$(document).ready(function () {
  AjaxControl();
});
