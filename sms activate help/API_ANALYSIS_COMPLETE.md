API protocol for working with SMS-Activate
API is a protocol between your software and our server

API is needed for automatization of the sms, otp, and pva receiving process on your side

To interact with our service through the API protocol, you need a unique individual API key


Generate key

In order to find out your API key, you canchange it. You will receive an email with a new API key.

Our API is fully compatible with competitor sites

All requests must go to https://api.sms-activate.ae/stubs/handler_api.php

POST or GET request.

All requests must contain an API key in the form of the api_key GET parameter

Activation API
Request the available quantity of virtual numbers
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getNumbersStatus&country=$country&operator=$operator
Parameters:

$api_key - API key

$country * - country number see table

$operator * mobile operator numbers, you can specify several numbers separated by commas (available only for:

Ukraine
kyivstar, life, utel, mts, vodafone
Kazakhstan
altel, beeline, activ
** available for $country = 1, $country = 2

ANSWER:

The response of the service will be in json format, example:

{"wa":90,"vi":223,"tg":158,"wb":106,"go":182,"fb":107}

Full list of services

Request for top countries by service FreePrice
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getTopCountriesByService&service=$service&freePrice=$freePrice
Parameters:

$api_key - API key

$service - Service see table

$freePrice * - optional parameter. If provided true, quantity and price will be provided according to Free Price

ANSWER:

The response of the service will be in json format, example:

{ "0": { "country: 2, "count": 43575, "price": 15.00, "retail_price": 30.00 }, ... }

$freePrice = true:

{ "0": { "country: 2, "count": 43575, "price": 15.00, "retail_price": 30.00, "freePriceMap": { "15.00": 43242, "18.00": 333 } }, ... }
POSSIBLE MISTAKES:

BAD_SERVICE - incorrect service name

Request top countries by service (current user rank is considered) FreePrice
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getTopCountriesByServiceRank&service=$service&freePrice=$freePrice
Parameters:

$api_key - API key

$service - Service see table

$freePrice * - optional parameter. If provided true, quantity and price will be provided according to Free Price

ANSWER:

The response of the service will be in json format, example:

{ "0": { "country: 2, "count": 43575, "price": 15.00, "retail_price": 30.00 }, ... }

$freePrice = true:

{ "0": { "country: 2, "count": 43575, "price": 15.00, "retail_price": 30.00, "freePriceMap": { "15.00": 43242, "18.00": 333 } }, ... }
POSSIBLE MISTAKES:

BAD_SERVICE - incorrect service name

Balance inquiry
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getBalance
Balance request with cashback account:

https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getBalanceAndCashBack
* returns the balance taking into account the accumulated cashback, if the checkbox in the cashback account settings 'Spend cashback on activation' is ticked

Parameters:

$api_key - API key

ANSWER:

ACCESS_BALANCE: 'account balance'

POSSIBLE MISTAKES:

BAD_KEY - invalid API key

ERROR_SQL - sql-server error

Request available operators
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getOperators&country=$country
* returns all operators available for the transferred country, if the country is not transferred - will return all operators available for each country

Parameters:

$api_key - API key

$country - country code

ANSWER:

The response of the service will be in json format:

{"status":"success", "countryOperators": {
"Country1Code": ["operator1Name","operator2Name","operator3Name", ...],
"Country2Code": ["operator1Name","operator2Name","operator3Name", ...],
...
}}
Example:

{"status":"success", "countryOperators": {
"1": ["life","mts","kyivstar","utel" ...],
"2": ["life","altel","mts","beeline" ...],
...
}}
* inside 'countryOperators' - the key will be the country code

POSSIBLE MISTAKES:

BAD_KEY - invalid API key

ERROR_SQL - sql-server error

OPERATORS_NOT_FOUND - no records found (e.g. non-existent country transferred)

Request active activations
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getActiveActivations
Parameters:

$api_key - API key

ANSWER:

The response of the service will be in json format:

{"status":"success", "activeActivations": [
{
"activationId" : "635468021",
"serviceCode" : "vk",
"phoneNumber" : "79********1",
"activationCost" : 12.50,
"activationStatus" : "4",
"smsCode" : ["CODE"],
"smsText" : "[Your CODE registration code]",
"activationTime" : "2022-06-01 16:59:16",
"discount" : "0.00",
"repeated" : "0",
"countryCode" : "2",
"countryName" : "Kazakhstan",
"canGetAnotherSms" : "1",
"currency": 840 //ISO 4217 Num
}]
POSSIBLE MISTAKES:

BAD_KEY - invalid API key

ERROR_SQL - sql-server error

NO_ACTIVATIONS - entries not found (no active activations)

Request a number FreePrice
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getNumber&service=$service&operator=$operator&ref=$ref&country=$country&phoneException=$phoneException&maxPrice=maxPrice&useCashBack=$useCashBack&activationType=$activationType&language=$language&userId=$userId
Parameters:

$api_key - API key

$service - service for ordering see table

* optional parameter, accepts 0 (do not execute, set by default), 1 (execute)

$maxPrice * - the maximum price for which you are ready to buy a number at Free Price

* optional parameter, if it is not specified, the purchase will take place at the regular price

$phoneException * - Exclusion prefixes for Kazakhstan numbers. Separate them with commas. Format: country code followed by 3 to 6 digits of a mask (e.g., 7918, 7900111). The default value is taken from the account.

$operator* is a mobile operator of the number, you can specify several of them with a comma (only available for **)

$activationType - activation type: 0 - with sms (default), 1 - with number, 2 - with voice

$language - parsing language (required for activation with voice) see table

$userId * - user ID to ban for poor activation statistics, but the reseller's own account is not affected.

Ukraine
kyivstar, life, utel, mts, vodafone
Kazakhstan
tele2, beeline, activ, altel
* optional field

** available for $country = 1, $country = 2

$ref - transfer the referral ID. More details

$country - country number see table

$useCashBack* - takes the boolean value, if the parameter is 'true', the number purchase will be made spending the cashback. After you run out of money on cashback balance, all subsequent purchases will be made using the balance. It is IMPORTANT to remember that all subsequent purchases will first of all use cashback, and after that the main balance is used (even if pass the parameter 'false' after that).

* optional parameter, accepts 'true'

By getting the number through the API, you agree with the project rules

POSSIBLE MISTAKES:

WRONG_MAX_PRICE:$min- the specified maximum price is less than the allowed one

$min - minimum allowable price

BAD_ACTION - incorrect action

BAD_SERVICE - incorrect service name

BAD_KEY - invalid API key

ERROR_SQL - sql-server error

BANNED:'YYYY-m-d H-i-s' - time for which the account is blocked

WRONG_EXCEPTION_PHONE - incorrect exclusion prefixes

CHANNELS_LIMIT - account blocked

NO_NUMBERS - no numbers

If you try to get the number of a specific operator that does not operate in the selected country or which does not have the selected service, the number of the first operator that matches the request parameters will be returned

V2 Number Request FreePrice
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getNumberV2&service=$service&operator=$operator&ref=$ref&country=$country&phoneException=$phoneException&maxPrice=maxPrice&activationType=$activationType&language=$language&userId=$userId
the method works similarly to the method getNumber, accepts the same parameters and additional ones described below, but returns additional activation information

Parameters:

$orderId- activation id from the reseller's system. When purchasing, this data is compared to the activation id and a reseller in our system. Thus, we want to achieve idempotence (the same order will not be processed again).

ANSWER:

If the request is successful, the response will be in the following format:

{
"activationId": 635468024,
"phoneNumber": "79584******",
"activationCost": 12.50,
"currency": 840, //ISO 4217 Num
"countryCode": "2",
"canGetAnotherSms": "1",
"activationTime": "2022-06-01 17:30:57",
"activationOperator": "mtt"
}
If you try to get the number of a specific operator that does not operate in the selected country or which does not have the selected service, the number of the first operator that matches the request parameters will be returned

POSSIBLE MISTAKES:

ORDER_ALREADY_EXISTS- order has already been created

Webhooks
IP addresses of Webhook requests

To ensure security and correct notification settings, please add the following IP addresses to the list of allowed sources (whitelist) on your server:

Webhooks for activations and rent count will come from the following IP addresses:

188.42.218.183
142.91.156.119
Ensure that your server accepts incoming requests from these addresses to avoid losing event notifications.

When you receive an SMS to a number, if you have enabled the Webhooks function in the settings, we will send information about the SMS via a POST-request to the addresses that you have specified

ANSWER:

The response format will be as follows:


{
	"activationId": 123456,
	"service": "go",
	"text": "Sms text",
	"code": "12345",
	"country": 2,
	"receivedAt": "2023-01-01 12:00:00"
}
				
When sending a request, we will wait for a response from your script with the HTTP status 200. If your script does not respond, we will send the request within 2 hours, but no more than 8 times.

In case there are errors in requests, you will receive a notification from the Telegram bot if it is connected to your account (no more than once every 5 minutes).

You can enable this functionality inthe profile settings

Ordering a virtual number for several services
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getMultiServiceNumber&multiService=$service&operator=$operator&ref=$ref&country=$country
Parameters:

$api_key - API key

$service - service for ordering see table

$operator * - mobile operator of the number, you can specify several numbers separated by commas (available only for **):

Ukraine
kyivstar, life, utel, mts, vodafone
Kazakhstan
tele2, beeline, activ, altel
$ref - transfer the referral ID. More details

$country - country number see table

By getting the number through the API, you agree with the project rules

ANSWER:

NO_NUMBERS - no numbers

NO_BALANCE - balance has ended

{ {'phone':phone,'activation':activation,'service':service},
{'phone':phone,'activation':activation,'service':service}}, where (phone - id operations, activation - Phone number, service - Service)

POSSIBLE MISTAKES:

BAD_ACTION - incorrect action

BAD_SERVICE - incorrect service name

BAD_KEY - invalid API key

ERROR_SQL - sql-server error

BANNED:'YYYY-m-d H-i-s' - time for which the account is blocked

Change of activation status
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=setStatus&status=$status&id=$id
Parameters:

$api_key - API key

$id - Activation ID

$status - activation status

3 - request one more code (for free)

6 - finish the activation *

8 - report the fact that the number has been already used and cancel the activation

* if there was a status 'code received' - marks it successfully and completes, if there was a 'preparation' - deletes and marks an error, if there was a status 'awaiting retry' - transfers activation to SMS pending

** It is not possible to change the activation status for which the verification method by call was selected if the number has already arrived

The simple logic of the chronology of working with API:

Getting a number using the getNumber method, then the following actions are available:

8 - cancel activation (if the number is not suitable for you)

1 - inform that SMS has been sent (optional)

To activation with status 1:

8 - cancel the activation

Immediately after receiving the code:

3 - request one more SMS

6 - confirm the SMS-code and finish the activation

To activation with status 3:

6 - confirm the SMS-code and finish the activation

ANSWER:

ACCESS_READY - numbers readiness confirmed

ACCESS_RETRY_GET - waiting for a new SMS

ACCESS_ACTIVATION - the service has been successfully activated

ACCESS_CANCEL - activation canceled

POSSIBLE MISTAKES:

EARLY_CANCEL_DENIED - it is not allowed to cancel a number within first 2 minutes

ERROR_SQL - sql-server error

NO_ACTIVATION - activation id does not exist

BAD_SERVICE - incorrect service name

BAD_STATUS - incorrect status

BAD_KEY - invalid API key

BAD_ACTION - incorrect action

WRONG_ACTIVATION_ID- invalid ID or ID is not a number.

Get activation status
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getStatus&id=$id
Parameters:

$api_key - API key

$id - Activation ID

ANSWER:

STATUS_WAIT_CODE - waiting for SMS

STATUS_WAIT_RETRY: 'past, unmatched code' - waiting for code clarification

STATUS_CANCEL- the activation is canceled or completed

STATUS_OK: 'activation code' - code received

POSSIBLE MISTAKES:

NO_ACTIVATION - activation id does not exist

ERROR_SQL - sql-server error

BAD_KEY - invalid API key

BAD_ACTION - incorrect action

Get an activation status Version 2
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getStatusV2&id=$id
Parameters:

$api_key - API key

$id - Activation ID

ANSWER:

The response format will be as follows:

{
"verificationType": 2, // 0 - SMS, 1 - call number, 2 - voice call
"sms": {
"dateTime": "0000-00-00 00:00:00",
"code": "code",
"text": "sms text",
},
"call": {
"from": "phone",
"text": "voice text",
"code": "12345",
"dateTime": "0000-00-00 00:00:00",
"url": "voice file url", // NULLABLE
"parsingCount": 1,
}
}
STATUS_CANCEL - activation canceled

POSSIBLE MISTAKES:

NO_ACTIVATION - activation id does not exist

ERROR_SQL - sql-server error

BAD_KEY - invalid API key

BAD_ACTION - incorrect action

Get activation history
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getHistory&start=$start&end=$end&offset=$offset&limit=$limit
Parameters:

$api_key - API key

$start * - timestamp in Unix Timestamp format (optional) - which date to consider activations from

$end * - timestamp in Unix Timestamp format (optional) - till which date to consider activations

$offset - offset of the first element returned in the response. Default is 0

$limit - maximum number returned records. Maximum is 100. Default is 50.

* dates are limited to 30 days

ANSWER:

The response format will be as follows:

[{
"id": 635468024,
"date": "2022-11-12 15:58:39",
"phone": "79918529716",
"sms": "sms":"["Your sms code"]",
"cost": 100 //For active ones cost = 0
"status": "4",
"currency": 840 //ISO 4217 Num
}]
POSSIBLE MISTAKES:

ERROR_SQL - sql-server error

BAD_KEY - invalid API key

BAD_ACTION - incorrect action

WRONG_DATE- date format is not timestamp or one of the dates is later than 30 days

Get TOP 10 countries by a service
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getListOfTopCountriesByService&service=$service
Parameters:

$api_key - API key

$service - service name

$length - page size (default 10)

$page - page number (default is 1; from new to old ones)

ANSWER:

The response format will be as follows:

[{
"country": 2,
"share": 50, // (Purchases of the chosen service by country as a percentage of the total quantity of purchases at our service)
"rate": 50 // (% of successful activations among the total number of activations by the country)
}]
POSSIBLE MISTAKES:

ERROR_SQL - sql-server error

BAD_KEY - invalid API key

WRONG_SERVICE - incorrect service

BAD_ACTION - incorrect action

Get the status of an incoming call
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getIncomingCallStatus&activationId=$id
Parameters:

$api_key - API key

$id - Activation ID

ANSWER:

The response of the service will be in json format, example:

{"status":"2","phone":false}
POSSIBLE STATUSES:

2 - new activation

3 - successfully finished

4 - canceled

5 - returned

POSSIBLE MISTAKES:

BAD_KEY - invalid API key

INVALID_ACTIVATION_ID - Invalid activation ID

Get current prices by country
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getPrices&service=$service&country=$country
Parameters:

$api_key - API key

$serviceShort name of the service (Optional, by default all services) see table

$countryCountry code name (Optional, defaults to all countries) see table

ANSWER:

JSON - object in format
{"Country":{"Service":{"cost":"Cost","count":"Quantity","physicalCount":"Number of physical numbers"}}}

* if there are no numbers, an empty object is returned

Get current prices by country FreePrice
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getPricesExtended&service=$service&country=$country&freePrice=$freePrice
Parameters:

$api_key - API key

$serviceShort name of the service (Optional, by default all services) see table

$countryCountry code name (Optional, defaults to all countries) see table

$freePrice * - optional parameter. If provided true, quantity and price will be provided according to Free Price

ANSWER:

JSON - object in format
{"Country":{"Service":{"cost":Cost,"count":Count}}}

Get up-to-date prices for services for verification
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getPricesVerification&service=$service
Parameters:

$api_key - API key

$serviceShort name of the service (Optional, by default all services) see table

ANSWER:

JSON - object in format
{"Service":{"Country":{"count":Quantity,"price":"Price"}}}

Get a list of all countries
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getCountries
Parameters:

$api_key - API key

ANSWER:

JSON - object in format { {'Страна':{'id':2,'rus':"Казахстан","eng:"Kazakhstan","chn":"哈萨克斯坦","visible":1,"retry":1,"rent":1,"multiService":1}},

where (

id : country id;

rus : country name in Russian;

eng : country name in English;

chn : country name in Chinese;

visible : 0 - country is not displayed on the site, 1 - displayed;

retry : 0 - repeated SMS is NOT available, 1 - available;

rent : 0 - country not leased, 1 - leased;

multiService : 0-country is NOT available for multiservice, 1- available.)

Get a list of all services
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getServicesList
Parameters:

$api_key- API key

$country *- Country ID. If you have passed the country, we return the services that have a price for the chosen country

$lang *- which language to use to provide `name`. Possible values: 'ru', 'en', 'es', 'cn'. The default is 'en'

* optional parameter

ANSWER:

JSON - object in format { "status": "success", "services": [ { "code": "aoo", "name": "Pegasus Airlines" } ] }

Virtual number reactivation
If you have made a successful activation on the number, then you can do it again.

The cost of additional activation is determined depending on the country and service. The specific cost can be obtained from this query.

https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getExtraActivation&activationId=$activationId
Parameters:

$api_key - API key

$activationId - Parent Activation ID

ANSWER:

ACCESS_NUMBER:$id:$phone - a new activation has been successfully created. Where $id is ID of additional activation, $phone is a phone number

POSSIBLE MISTAKES:

RENEW_ACTIVATION_NOT_AVAILABLE- the number is not available for additional activation

WRONG_ACTIVATION_ID - Incorrect parental activation ID

ERROR_SQL- database error, contact the customer service

NEW_ACTIVATION_IMPOSSIBLE- it is impossible to make additional activation

NO_BALANCE - no money in the account

Get a price for additional number activation
You can find out the availability of the number for additional activation and get its cost

https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=checkExtraActivation&activationId=$activationId
Parameters:

$api_key - API key

$activationId - Parent Activation ID

ANSWER:

JSON - object in format {'status': 'success', 'cost':200,"service":"tw","phone":777777777,"country":14},

POSSIBLE MISTAKES:

RENEW_ACTIVATION_NOT_AVAILABLE- the number is not available for additional activation

WRONG_ACTIVATION_ID - Incorrect parental activation ID

SIM_OFFLINE - SIM card offline

Repeated voice parsing
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=parseCall&id=$id&newLang=$newLang
Parameters:

$api_keyapi key

$id - Activation ID

$newLang - new parsing language see table

ANSWER:

The response format will be as follows:

{
"result": "OK"
}
STATUS_CANCEL - activation canceled

NO_CALL- no call was received

PARSE_COUNT_EXCEED- limit of parsing attempts (maximum is 4)

POSSIBLE MISTAKES:

WRONG_ACTIVATION_ID - invalid activation id, it does not exist or it is not active

ERROR_SQL - sql-server error

BAD_KEY - invalid API key

BAD_ACTION - incorrect action

Rent Api
Request available countries and services
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getRentServicesAndCountries&rent_time=$time&operator=$operator&country=$country&incomingCall=$incomingCall¤cy=$currency
Parameters:

$api_key - API key

$time* – rental time (default: 2 hour(s))

$operator* - mobile operator of the number, you can specify several of them separated by commas (by default: Any)

$country* - country (default: Kazakhstan)

$currency* - iso code of the currency in which to display prices

$incomingCall * - if transferred "true"get a number supporting a function to receive a call

ANSWER:

The response of the service will be in json format, example:

{ "countries": { "0": 2 }, "operators": { "0": "aiva", "1": "any", "2": "beeline", ... "16": "altel" }, "services": { "full": { "cost": 42.93, "quant": 20 }, "vk": { "cost": 21.95, "quant": 20 }, "ok": { "cost": 7.68, "quant": 55 }, "ot": { "cost": 5.2, "quant": 42 } }, "currency": 840 }

POSSIBLE MISTAKES:

BAD_KEY - invalid API key

OUT_OF_STOCK - numbers for that country are unavailable

Order a virtual number rental
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getRentNumber&service=$service&rent_time=$time&operator=$operator&country=$country&url=$url&incomingCall=$incomingCall
Parameters:

$api_key - API key

$service - the service for which you need to get a number

$time* – rental time in hours (default: 2 hour(s)). For a rental request of one day or more, you must pass: 24, 48, 72, etc.

$operator* - mobile operator of the number, you can specify several of them separated by commas (by default: Any)

$country* - country (default: Kazakhstan)

$url * - a link for the webhook (is not considered by default)

$incomingCall * - if transferred "true"get a number supporting a function to receive a call

What is webHook?

* optional parameter. If not specified, the default parameter will be used.

ANSWER:

The response of the service will be in json format, example:

{ "status": "success", "phone": { "id": 1049, "endDate": "2020-01-31T12:01:52", "number": "79959707564" } }

POSSIBLE MISTAKES:

BAD_KEY - invalid API key

Answer in json format:

{ "status": "error", "message": "*possible_answer*" }


Possible answers in the field "message":

BAD_SERVICE - service not specified or name is incorrect

NO_BALANCE - no money in the account

NO_NUMBERS - no numbers

ACCOUNT_INACTIVE- the account is not active

SERVER_ERROR - server error

CHANNELS_LIMIT - account blocked

get status for rent
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getRentStatus&id=$id&page=$page&size=$size
Parameters:

$api_key - API key

$id - Rental ID received in the reply when ordering a number

$page* - page number which the selection starts with (from new to old ones; default is 1)

$size* - page size (default 10)

* optional parameter. If not specified, the default parameter will be used.

ANSWER:

The response of the service will be in json format, example:

{ "status": "success", "quantity": "2", "values": { "0": { "phoneFrom": "79180230628", "text": "5", "service": "ot", "date": "2020-01-30 14:31:58" }, "1": { "phoneFrom": "79180230628", "text": "4", "service": "ot", "date": "2020-01-30 14:04:16" } } }

* successful only when there is a sms (box 'quantity' > 0).

POSSIBLE MISTAKES:

BAD_KEY - invalid API key

Answer in json format:

{ "status": "error", "message": "*possible_answer*" }


Possible answers in the field "message":

NO_ID_RENT - rent ID is not specified

INVALID_PHONE - the number is rented not by you (invalid rent ID)

STATUS_FINISH - rent paid and completed

STATUS_CANCEL - rent canceled with a refund

STATUS_WAIT_CODE - waiting for the first SMS

STATUS_REVOKE - The number is blocked, your funds have been returned

Rental Status Change
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=setRentStatus&id=$id&status=$status
Parameters:

$api_key - API key

$id - Rental ID received in the reply when ordering a number

$status - code for changing the status (number)

The status can be:

1
Finish
2
Cancel
ANSWER:

The response of the service will be in json format:

{ "status": "success" }

POSSIBLE MISTAKES:

BAD_KEY - invalid API key

Answer in json format:

{ "status": "error", "message": "*possible_answer*" }

Possible answers in the field "message":

NO_ID_RENT - rent ID is not specified

INCORECT_STATUS - missing or incorrectly specified status

CANT_CANCEL - it is impossible to cancel the lease (more than 20 min.)

INVALID_PHONE - the number is rented not by you (invalid rent ID)

ALREADY_FINISH - the lease has already been completed

ALREADY_CANCEL - the lease has already been canceled

SERVER_ERROR - server error

List current activations
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getRentList

Parameters:

$api_key - API key

$length - page size (default 10)

$page - page number (default is 1)

ANSWER:

The response of the service will be in json format:

{ "status": "success", "values": { "0": { "id": "12345", "phone": "79181234567" }, "1": { "id": "12345", "phone": "79181234568" } } }

POSSIBLE MISTAKES:

BAD_KEY - invalid API key

BAD_ACTION - incorrect action


Answer in json format:

{ "status": "error", "message": "*possible_answer*" }


Possible answers in the field "message":

NO_NUMBERS - no rented numbers

SERVER_ERROR - server error

Extend your lease
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=continueRentNumber&id=$id&rent_time=$time
Parameters:

$api_key - API key

$id - id rent

$rent_time– rental time (default: 2 hour(s))

ANSWER:

The response of the service will be in json format:

{ "status": "success", "phone": { "id": 1049, "endDate": "2020-01-31T12:01:52", "number": "79959707564"} }

When a completed rent is prolonged, it will be reordered, a new id will be provided

POSSIBLE MISTAKES:

BAD_KEY - invalid API key

BAD_ACTION - incorrect action

SERVER_ERROR - server error


Answer in json format:

{ "status": "error", "message": "*possible_answer*", "info": "*details*" }


Possible answers in the field "message":

NO_ID_RENT - there is no rent ID

INVALID_TIME– invalid time. Available hours range from 2 to 1344.

MAX_HOURS_EXCEED - The maximum of available time was exceeded

info:
max - maximum available time

INVALID_PHONE - incorrect rent ID

RENT_DIE - rent cannot be extended because the number has expired

NO_BALANCE - insufficient funds

CHANNELS_LIMIT - account blocked

Get the cost of rent renewal (deprecated)
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getContinueRentPriceNumber&id=$id&rent_time=$time¤cy=$currency
continueRentInfo – use this method instead of the outdated one

Parameters:

$api_key - API key

$id - id rent

$rent_time - rent time

$currency* - iso code of the currency in which to display the price

ANSWER:

The response of the service will be in json format:

{ "status": "success", "price": 6.33, "currency": 840 }

POSSIBLE MISTAKES:

BAD_KEY - invalid API key

BAD_ACTION - incorrect action

SERVER_ERROR - server error


Answer in json format:

{ "status": "error", "message": "*possible_answer*" }


Possible answers in the field "message":

NO_ID_RENT - there is no rent ID

INVALID_PHONE - incorrect rent ID

INVALID_TIME - incorrect time setting

RENT_DIE - rent cannot be extended because the number has expired

MAX_HOURS_EXCEED - The maximum of available time was exceeded

info:
max - maximum available time

CHANNELS_LIMIT - account blocked

Get information about the rent prolongation: the maximum term and price with history
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=continueRentInfo&id=$id&hours=$hours&needHistory=$needHistory
Parameters:

$api_key - API key

$id - id rent

$hours - rent time

$needHistory* - get the whole list of extension cases. Accepts a boolean value (true or false).

ANSWER:

The response of the service will be in json format:

{ "status": "success", "price": 6.33, "currency": 840, "hours": 4, "history": {"0": {"createDate": "2024-10-07 12:10:47", "price": "101.9", "hours": 4} }

POSSIBLE MISTAKES:

BAD_KEY - invalid API key

BAD_ACTION - incorrect action

SERVER_ERROR - server error


Answer in json format:

{ "status": "error", "message": "*possible_answer*" }


Possible answers in the field "message":

NO_ID_RENT - there is no rent ID

INVALID_PHONE - incorrect rent ID

INVALID_TIME - incorrect time setting

RENT_DIE - rent cannot be extended because the number has expired

MAX_HOURS_EXCEED - The maximum of available time was exceeded

info:
max - maximum available time

CHANNELS_LIMIT - account blocked

API Partner software
Buy partner software
https://api.sms-activate.ae/stubs/handler_api.php?action=buyPartnerProduct&productId=$id&api_key=$api_key
Parameters:

$api_key - API key

$id- Id of the software that you need to purchase

ANSWER:

The response of the service will be in json format, example:

{
                            "status": "success",
                            "key": "F5qrzFoY6afj3zrEq7SeMplbx",
                            "manual": "Software download link:"
                        }
POSSIBLE MISTAKES:

BAD_DATA - Incorrect ID or ID is not a number

BAD_ACTION - invalid action or the reseller is not verified.
