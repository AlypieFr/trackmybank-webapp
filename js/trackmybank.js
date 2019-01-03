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
    $("#del-subtr").on("click touch", trackmybank.del_transaction);
    $("#reset").on("click touch", trackmybank.cancel);
    $("#send").on("click touch", trackmybank.send);
    $(document).on("keypress", ".money", function() {
        let value = $(this).val();
        let comma = value.indexOf(".");
        let len = value.length;
        if (comma > -1) {
            let len_after_comma = len - comma;
            if (len_after_comma > 2) {
                $(this).val(value.substr(0, len - (len_after_comma - 2)));
            }
        }
    })
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
        autoclose: true,
        forceParse: false,
        todayHighlight: true
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
                        $(".category").append(new Option(cat["name"], cat["id"]));
                    });
                }
                trackmybank.init_special_fields();
                credentials.token = data["token"];
                $("#date_t").val( moment().format('DD/MM/YYYY') );
                trackmybank.transaction_html = $("#transactions .transaction:first").clone();
            }
        });
};

trackmybank.send = function() {
    trackmybank.hide_notify();
    let transactions = [];
    let transation_date = $("#date_t").val();
    let valid = true;
    $.each($("#transactions").find(".transaction"), function(t, transaction) {
        let tr = $(transaction)
        let montant = tr.find(".amount").val();
        let category = tr.find(".category").val();
        if (montant === "" || category === "") {
            trackmybank.notify("error", "Erreur : tous les champs sont requis !");
            valid = false;
            return false;
        }
        transactions.push({
            "amount": parseFloat(montant),
            "category": parseInt(category)
        })
    });
    if (valid) {
        trackmybank.post(credentials.url + "/api/transactions/", {
            transation_date: transation_date,
            transactions: transactions
        }, function(data, success) {
            try {
                if ("success" in data && data["success"] === true) {
                    trackmybank.cancel();
                    let message = "Transaction ajoutée !";
                    let nb_subtr = transactions.length;
                    if (nb_subtr > 1) {
                        message += " (avec " + nb_subtr.toString() + " sous-transactions)";
                    }
                    trackmybank.notify("success", message)
                }
                else {
                    if ("message" in data) {
                        trackmybank.notify("error", data.message);
                    }
                    else {
                        trackmybank.notify("error", "Une erreur inconnue s'est produite.");
                    }
                }
            } catch (e) {
                trackmybank.notify("error", "Une erreur inconnue s'est produite");
            }
        })
    }
};

trackmybank.add_transaction = function () {
    $("#transactions").append(trackmybank.transaction_html.clone());
    $("#del-subtr").show();
    trackmybank.scroll_to_bottom();
};

trackmybank.del_transaction = function () {
    let transactions = $("#transactions .transaction");
    transactions.last().remove();
    if (transactions.length === 1) {
        $("#del-subtr").hide();
    }
};

trackmybank.cancel = function() {
    $("#transactions .transaction").remove();
    trackmybank.add_transaction();
    $("#del-subtr").hide();
};

trackmybank.hide_notify = function() {
    $("#notify").html("").attr("class", "").hide();
};

trackmybank.scroll_to_top = function(callback) {
    $("html, body").animate({ scrollTop: 0 }, 200);
    if (callback !== null) {
        setTimeout(callback, 200);
    }
};

trackmybank.scroll_to_bottom = function(callback) {
    $("html, body").animate({ scrollTop: $(document).height() }, 200);
    if (callback !== null) {
        setTimeout(callback, 200);
    }
};

trackmybank.notify = async function(level, message) {
    trackmybank.scroll_to_top(function() {
        $("#notify").html(message).attr("class", level).addClass('animated zoomIn').show();
        trackmybank.timeout = setTimeout(function(){
            $("#notify").removeClass("animated zoomIn").addClass("animated fadeOutUp").hide().html("").attr("class", "");
        }, 5000);
    });
};

trackmybank.ajax = function (url, data, success, error, method = "POST", async = true) {
    let options = {
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
    };
    if (credentials.token !== undefined) {
       options["beforeSend"] = function (xhr) {
            xhr.setRequestHeader("Authorization", "Token " + credentials.token);
        }
    }
    $.ajax(url,
        options
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