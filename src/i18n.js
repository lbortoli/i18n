'use strict';

angular.module('i18n', [])
.factory('translation', [
    '$log', '$q', '$http',
    function ($log, $q, $http) {
        var currentLanguage = null;
        var translations = {};
        var languagePromise = null;
        var translationPromises = [];
        var configurationPromise = null;

        var extendFlagDefaultValue = false;

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

        var isValidExtendFlag = function (extend) {
            return extend === undefined || (extend !== null && typeof extend === 'boolean');
        };

        return {
            language: function (language) {
                var deferred = $q.defer();
                languagePromise = deferred.promise;

                if (isValidLanguage(language)) {
                    deferred.resolve(language);
                } else {
                    deferred.reject('Invalid language "' + language + '". It must be a non empty string');
                }

                return this;
            },
            translation: function (language, translation, extend) {
                var deferred = $q.defer();
                translationPromises.push(deferred.promise);

                if (!isValidLanguage(language)) {
                    deferred.reject('Invalid language "' + language + '". It must be a non empty string');
                } else if (!isValidTranslation(translation)) {
                    deferred.reject('Invalid translation. It must be a non empty object')
                } else if (!isValidExtendFlag(extend)) {
                    deferred.reject('Invalid extend option. It must be a boolean value or undefined')
                } else {
                    deferred.resolve({language: language, translation: translation, extend: extend});
                }

                return this;
            },
            translationUrl: function (language, translationUrl, extend) {
                var deferred = $q.defer();
                translationPromises.push(deferred.promise);

                if (!isValidLanguage(language)) {
                    deferred.reject('Invalid language "' + language + '". It must be a non empty string');
                } else if (!isValidTranslationUrl(translationUrl)) {
                    deferred.reject('Invalid translation URL "' + translationUrl + '". It must be a non empty URL string')
                } else if (!isValidExtendFlag(extend)) {
                    deferred.reject('Invalid extend option. It must be a boolean value or undefined')
                } else {
                    $http({
                        method: 'GET',
                        url: translationUrl,
                        params: {
                            language: language
                        }
                    }).then(function (response) {
                        var translation = response.data;

                        if (isValidTranslation(translation)) {
                            deferred.resolve({language: language, translation: translation, extend: extend});
                        } else {
                            deferred.reject('Invalid translation fetched from "' + translationUrl + '"');
                        }
                    }, function () {
                        deferred.reject('Error fetching translation from "' + translationUrl + '"');
                    });
                }

                return this;
            },
            configure: function () {
                var deferred = $q.defer();
                configurationPromise = deferred.promise;
                var hasErrors = false;

                var promise = $q.when(null);
                if (languagePromise) {
                    promise = promise.then(function () {
                        return languagePromise.then(function (language) {
                            //TODO log
                            currentLanguage = language;
                        }, function (cause) {
                            $log.error(cause);
                        });
                    });
                }
                if (translationPromises.length > 0) {
                    translationPromises.forEach(function (translationPromise) {
                        promise = promise.then(function () {
                            return translationPromise.then(function (data) {
                                //TODO log
                                var extend = data.extend || extendFlagDefaultValue;
                                if(extend) {
                                    translations[data.language] = angular.extend({}, translations[data.language], data.translation);
                                } else {
                                    translations[data.language] = data.translation;
                                }
                            }, function (cause) {
                                $log.error(cause);
                            });
                        });
                    });
                }
                promise.finally(function () {
                    //TODO log
                    languagePromise = null;
                    translationPromises = [];
                    deferred.resolve();
                });
            },
            translate: function (label, parameters) {
                if (!configurationPromise) {
                    return $q.reject('i18n not configured.');
                }

                return configurationPromise.then(function () {
                    if (!isValidLabel(label)) {
                        return $q.reject('Invalid label.');
                    }

                    if (!currentLanguage) {
                        return $q.reject('The current language is not configured.');
                    }

                    if (!translations[currentLanguage] || !translations[currentLanguage][label]) {
                        return $q.reject('No message found for label "' + label + '".');
                    }

                    var value = translations[currentLanguage][label];
                    if (parameters) {
                        if (!isValidParameters(parameters)) {
                            return $q.reject('Invalid parameters for label "' + label + '".');
                        }

                        var regExp;
                        for (var i = 0; i < parameters.length; i++) {
                            regExp = new RegExp('\\{' + i + '\\}', 'g');
                            value = value.replace(regExp, parameters[i]);
                        }
                    }

                    return value;
                });
            }
        };
    }
])
.directive('i18n', [
    'translation',
    function (translation) {
        var controller = ['$scope', function ($scope) {
            $scope.message = '{{ i18n }}';

            translation.translate($scope.key, $scope.params())
                .then(function (messageValue) {
                    $scope.message = messageValue;
                });
        }];

        return {
            restrict: 'E',
            replace: true,
            scope: {
                key: '@',
                params: '&'
            },
            controller: controller,
            template: '<span>{{ message }}</span>'
        };
    }
]);
