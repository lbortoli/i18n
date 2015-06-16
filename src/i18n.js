angular.module('i18n', [])
.factory('translationService', function($log, $http) {
   var currentLanguage;
   var values = {};

   return {
      language: function(language) {
         currentLanguage = language;
         $log.info('Set language to "' + language + '"');
         return this;
      },
      translation: function(language, translation) {
         values[language] = translation;
         $log.info('Setting translation to "' + language + '" language');
         return this;
      },
      translationUrl: function(language, translationUrl) {
         $log.info('Fetching translation from "' + translationUrl + '"');
         $http({
            method: 'GET',
            url: translationUrl,
            params: {
               language: language
            }
         }).then(function(data) {
            var translation = angular.fromJson(data);
            // TODO: add validations
            values[language] = translation;
            $log.info('Setting translation to "' + language + '" language');
         }).catch(function(cause) {
            $log.error('Error fetching translation from "' + translationUrl + '"');
         }).finally(function() {
            return this;
         });
      },
      translate: function(label, parameters) {
         if(!values[currentLanguage] || !values[currentLanguage][label]) {
            $log.error('No message found for label "' + label + '"');
            return '';
         }

         var value = values[currentLanguage][label];
         if(parameters) {
            var regExp;
            for(var i=0; i<parameters.length; i++) {
               regExp = new RegExp('\\{' + i + '\\}','g');
               value = value.replace(regExp , parameters[i]);
            }
         }
         return value;
      }
   };
})
.filter('translate', function(translationService) {
   return function(label, parameters) {
      return translationService.translate(label, parameters);
   };
});
