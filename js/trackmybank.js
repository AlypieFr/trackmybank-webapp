trackmybank = {};

trackmybank.init = function() {
    $("#dologin").on("click touch", trackmybank.login);
};

trackmybank.login = function() {
    $("#login").hide();
    $("#logged").show();
};