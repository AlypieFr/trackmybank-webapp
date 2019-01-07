trackmybank = {};

trackmybank.timeout = null;
trackmybank.transaction_html = null;

trackmybank.amounts = [[]];

function getSum(total, num) {
    return total + num;
}

trackmybank.init = function() {
    $("#dologin").on("click touch", trackmybank.login);
    $("form#login-form").on("submit", function(e) {
        e.preventDefault();
        trackmybank.login();
    });
    $("form#add-form").on("submit", function(e) {
        e.preventDefault();
        return false;
    });
    $("#add-subtr").on("click touch", trackmybank.add_transaction);
    $("#del-subtr").on("click touch", trackmybank.del_transaction);
    $("#reset").on("click touch", trackmybank.cancel);
    $("#send").on("click touch", trackmybank.send);
    $(document).on("click touch", "input.addition", trackmybank.transaction_addition);
    $(document).on("keypress", "input.amount", function(e) {
        if (e.which === 13) {
            trackmybank._transaction_addition($(this).parent("div.transaction"));
        }
    });
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
    });
    $("#show-addition").on("click touch", trackmybank.show_addition);
    $(document).on("click touch", "#goback", trackmybank.goback);
    $(document).on("click touch", "table.addition tr", function() {
        if ($(this).hasClass("selected")) {
            $(this).removeClass("selected");
        }
        else {
            $(this).addClass("selected");
        }
    });
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
        function(data) {
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
                if ("months" in data) {
                    $.each(data["months"], function (m, month) {
                        let option = new Option(month["name"], month["id"]);
                        if ("current_month" in data && month["id"] === data["current_month"]) {
                            option.selected = true;
                        }
                        $("#month").append(option);
                    })
                }
                trackmybank.init_special_fields();
                credentials.token = data["token"];
                $("#date_t").val( moment().format('DD/MM/YYYY') );
                trackmybank.transaction_html = $("#transactions .transaction:first").data("nb", 0).clone();
            }
        });
};

trackmybank.force_additions = function() {
    $(".addition").each(function() {
        $(this).trigger("click");
    });
};

trackmybank.goback = function() {
    $("#addition").hide();
    $("#logged").show();
}

trackmybank.show_addition = function() {
    trackmybank.force_additions();
    let addition = $("#addition");
    addition.html("");
    let empty = true;
    let full_total = 0;
    $(".transaction").each(function(t, transaction) {
        let s_desc = $(transaction).find(".description").val();
        let s_cat = $(transaction).find(".category option:selected").text();
        if (trackmybank.amounts[t].length > 0 && s_cat !== "" && s_desc !== "") {
            empty = false;
            let t_total = trackmybank.getTotal(t);
            full_total += parseFloat(t_total);
            addition.append($("<h2>").html(s_desc + " (" +
                s_cat + ") - " + t_total + " €"));
            let table = $("<table>").attr("class", "table-striped addition");
            for (let i=0; i<trackmybank.amounts[t].length; i++) {
                let row = $("<tr>");
                row.append($("<td>").html("&#x2713;"));
                row.append($("<td>").html(trackmybank.getStringAmount(trackmybank.amounts[t][i]) + " €"));
                table.append(row);
            }
            addition.append(table);
        }
    });
    if (!empty) {
        addition.append($("<h2>").html("Total"));
        addition.append($("<p>").attr("class", "total-addition").html(trackmybank.getStringAmount(full_total) + " €"));
        addition.append($("<button>").attr("id", "goback").attr("type", "button").html("Retour"));
        $("#logged").hide();
        addition.show();
    }
};

trackmybank.send = function() {
    trackmybank.force_additions();
    trackmybank.hide_notify();
    let transactions = [];
    let month = parseInt($("#month").val());
    let transation_date = $("#date_t").val();
    let valid = true;
    $.each($("#transactions").find(".transaction"), function(t, transaction) {
        let tr = $(transaction);
        let description = tr.find(".description").val();
        let montant = trackmybank.getTotal(t);
        let category = tr.find(".category").val();
        if (montant === "" || category === "" || description === "") {
            trackmybank.notify("error", "Erreur : tous les champs sont requis !");
            valid = false;
            return false;
        }
        transactions.push({
            "description": description,
            "amount": parseFloat(montant),
            "category": parseInt(category)
        })
    });
    if (valid) {
        trackmybank.post(credentials.url + "/api/transactions/", {
            month: month,
            transaction_date: transation_date,
            transactions: JSON.stringify(transactions)
        }, function(data) {
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

trackmybank.getStringAmount = function(amount) {
    let number = amount.toString();
    let comma = number.indexOf(".");
    if (comma === -1) {
        comma = number.indexOf(",");
        if (comma === -1) {
            comma = number.length;
        }
    }
    let floatNumber = parseFloat(number);
    return floatNumber.toPrecision(comma + (floatNumber >= 1 ? 2 : ((floatNumber < 0 && floatNumber > -1) ? 0 : 1)));
};

trackmybank.getTotal = function(nbSubTr) {
    if (trackmybank.amounts[nbSubTr].length === 0) {
        return ""
    }
    let number = trackmybank.amounts[nbSubTr].reduce(getSum).toString();
    return trackmybank.getStringAmount(number);
};

trackmybank._transaction_addition = function(transaction) {
    let nb = transaction.data("nb");
    let to_add = transaction.find(".amount").val();
    if (to_add !== "") {
        to_add = parseFloat(to_add);
        if (trackmybank.amounts[nb].length === 0) {
            transaction.find(".amount").css("width", "calc(100% - 242px)");
            transaction.find(".total").show();
        }
        trackmybank.amounts[nb].push(to_add);
        transaction.find(".total-amount").val(trackmybank.getTotal(nb));
        transaction.find(".amount").val("");
    }
};

trackmybank.transaction_addition = function() {
    trackmybank._transaction_addition($(this).parent("div.transaction"));
};

trackmybank.add_transaction = function () {
    $("#transactions").append(trackmybank.transaction_html.clone().data("nb", trackmybank.amounts.length));
    $("#del-subtr").show();
    trackmybank.amounts.push([]);
    trackmybank.scroll_to_bottom();
};

trackmybank.del_transaction = function () {
    let transactions = $("#transactions");
    transactions.find(".transaction").last().remove();
    trackmybank.amounts.splice(-1, 1);
    if (transactions.find(".transaction").length === 1) {
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

trackmybank.ajax = function (url, data, success_m, error_m, method = "POST", async = true) {
    let loading = $(".loading");
    loading.show();
    setTimeout(function() {
        let options = {
            method: method,
            data: data,
            success: function (data, success) {
                success_m(data, success);
                loading.hide();
            },
            error: function (res) {
                loading.hide();
                if (error_m === undefined) {
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
                } else {
                    error_m(res);
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
    }, 0);
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