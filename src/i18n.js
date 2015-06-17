'use strict';

angular.module('i18n', [])
.factory('translation', [
    '$log', '$q', '$http',
    function ($log, $q, $http) {
        var currentLanguage = null;
        var translations = {};
        var languagePromise = null;
        var translationPromises = [];

        var isStringValue = function (value) {
            return value && typeof value === 'string' && value !== '';
        };

        var isValidLanguage = function (language) {
            return isStringValue(language);
        };

        var isValidLabel = function (label) {
            return isStringValue(label);
        };

        var isValidParameters = function (parameters) {
            return parameters && parameters !== null && Array.isArray(parameters);
        };

        var isValidTranslation = function (translation) {
            return translation && translation !== null && typeof translation === 'object';
        };

        var isValidTranslationUrl = function (translationUrl) {
            return isStringValue(translationUrl);
        };

        return {
            language: function (language) {
                var deferred = $q.defer();
                if (isValidLanguage(language)) {
                    deferred.resolve(language);
                } else {
                    deferred.reject('Invalid language. It must be a non empty string');
                }
                languagePromise = deferred.promise;

                return this;
            },
            translation: function (language, translation) {
                var deferred = $q.defer();
                if (!isValidLanguage(language)) {
                    deferred.reject('Invalid language. It must be a non empty string');
                } else if (!isValidTranslation(translation)) {
                    deferred.reject('Invalid translation. It must be a non empty object')
                } else {
                    deferred.resolve({language: language, translation: translation});
                }
                translationPromises.push(deferred.promise);

                return this;
            },
            translationUrl: function (language, translationUrl) {
                var deferred = $q.defer();
                if (!isValidLanguage(language)) {
                    deferred.reject('Invalid language. It must be a non empty string');
                } else if (!isValidTranslationUrl(translationUrl)) {
                    deferred.reject('Invalid translation URL. It must be a non empty URL string')
                } else {
                    $http({
                        method: 'GET',
                        url: translationUrl,
                        params: {
                            language: language
                        }
                    }).then(function (data) {
                        var translation = angular.fromJson(data);// TODO process fromJson possible errors

                        if (isValidTranslation(translation)) {
                            deferred.resolve({language: language, translation: translation});
                        } else {
                            deferred.reject('Invalid translation fetched from "' + translationUrl + '"');
                        }
                    }, function (cause) {
                        deferred.reject('Error fetching translation from "' + translationUrl + '"');
                    });
                }
                translationPromises.push(deferred.promise);

                return this;
            },
            configure: function () {
                if (!languagePromise || translationPromises.length === 0) {
                    $log.error('i18n not properly configured. The language and at least one translation must be set.');
                } else {
                    var promise = $q.when(null);
                    translationPromises.forEach(function (translationPromise) {
                        promise = promise.then(function () {
                            return translationPromise.then(function (data) {
                                //TODO log
                                translations[data.language] = data.translation;
                            }, function (cause) {
                                $log.error('Error: ' + cause);
                            });
                        });
                    });
                    promise.then(function () {
                        return languagePromise.then(function (language) {
                            //TODO log
                            currentLanguage = language;
                        }, function (cause) {
                            $log.error('Error: ' + cause);
                        });
                    }).finally(function () {
                        languagePromise = null;
                        translationPromises = [];
                    });
                }
            },
            translate: function (label, parameters) {
                if (!isValidLabel(label)) {
                    $log.error('Invalid label.');
                    return '';
                }

                if (!currentLanguage) {
                    $log.error('The current language is not configured.');
                    return label;
                }

                if (!translations[currentLanguage] || !translations[currentLanguage][label]) {
                    $log.error('No message found for label "' + label + '".');
                    return label;
                }

                var value = translations[currentLanguage][label];
                if (parameters) {
                    if (!isValidParameters(parameters)) {
                        $log.error('Invalid parameters for label "' + label + '".');
                        return value;
                    }

                    var regExp;
                    for (var i = 0; i < parameters.length; i++) {
                        regExp = new RegExp('\\{' + i + '\\}', 'g');
                        value = value.replace(regExp, parameters[i]);
                    }
                }
                return value;
            }
        };
    }])
.filter('translate', [
    'translation',
    function (translation) {
        return function (label, parameters) {
            return translation.translate(label, parameters);
        };
    }]);
