trackmybank = {};

trackmybank.timeout = null;
trackmybank.transaction_html = null;

trackmybank.init = function() {
    $("#dologin").on("click touch", trackmybank.login);
    $("form#login-form").on("submit", function(e) {
        e.preventDefault();
        trackmybank.login();
    });
    $("form#add-form").on("submit", function(e) {
        e.preventDefault();
    });
    $("#add-subtr").on("click touch", trackmybank.add_transaction);
    trackmybank.transaction_html = $("#transactions .transaction:first");
    $("#reset").on("click touch", trackmybank.cancel);
};

trackmybank.init_special_fields = function () {
    trackmybank.set_datemask();
};

trackmybank.set_datemask = function (element) {
    // Datetime picker:
    $(element ? element : '.datepicker').datepicker({
        format: "dd/mm/yyyy",
        weekStart: 1,
        todayBtn: "linked",
        language: "fr",
        autoclose: true
    }).attr("readonly", "readonly");
};

trackmybank.login = function() {
    trackmybank.post(credentials.url+ "/api/auth/",
        {
            username: credentials.username,
            password: $("#password").val(),
            authorized_key: credentials.app_key
        },
        function(data, success) {
            if ("success" in data && data["success"]) {
                if (trackmybank.timeout !== null) {
                    clearTimeout(trackmybank.timeout);
                    trackmybank.hide_notify();
                }
                $("#login").hide();
                $("#logged").show();
                if ("categories" in data) {
                    $.each(data["categories"], function(c, cat) {
                        $("#category").append(new Option(cat["name"], cat["id"]));
                    });
                }
                trackmybank.init_special_fields();
                credentials.token = data["token"];
            }
        });
};

trackmybank.add_transaction = function () {
    $("#transactions").append(trackmybank.transaction_html.clone());
};

trackmybank.cancel = function() {
    $("#transactions .transaction").remove();
    trackmybank.add_transaction();
};

trackmybank.hide_notify = function() {
    $("#notify").html("").attr("class", "").hide();
};

trackmybank.notify = async function(level, message) {
    $("#notify").html(message).attr("class", level).show();
    trackmybank.timeout = setTimeout(function(){
        $("#notify").html("").attr("class", "").hide();
    }, 5000);
};

trackmybank.ajax = function (url, data, success, error, method = "POST", async = true) {
    $.ajax(url,
        {
            method: method,
            data: data,
            success: success,
            error: error || function (res) {
                if (res.status === 0) {
                    trackmybank.notify("error", "Vérifiez votre connexion internet.");
                    return false;
                } else {
                    try {
                        data = JSON.parse(res.responseText);
                        if ("message" in data) {
                            trackmybank.notify("error", data.message);
                            return true;
                        }
                    } catch (e) {
                        // do nothing
                    }
                    trackmybank.notify("error", "Une erreur est survenue. Veuillez contacter le support.");
                }
            },
            async: async,
        }
    );
};

trackmybank.post = function (url, data, success, error, async = true) {
    trackmybank.ajax(
        url,
        data,
        success,
        error,
        "POST",
        async
    );
};

trackmybank.get = function (url, data, success, error, async = true) {
    trackmybank.ajax(
        url,
        data,
        success,
        error,
        "GET",
        async
    );
};