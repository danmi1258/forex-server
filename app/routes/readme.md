Clients
=======

Запросить всех клиентов
-----------------------

http://domain.com/api/clients
> Response:
> 200: Array, [{Client}, ...] - array of Client objects
> 
> Errors:
> 401: "Unauthorized"


Запросить клиента по id
-----------------------

http://domain.com/api/clients/:id
> Response:
> 200: Object, {Client} - Client object
> 
> Errors:
> 404 "not found" - запрошенный документ не найден
> 401: "Unauthorized"


Провести поиск по параметрам
-----------------------------

GET: http://domain.com/api/clients/find?[filedName=value]
> Response:
> 200: Array, [{Client}, ...] - array of Client objects
> 
> Errors:
> 401: "Unauthorized"
 


Получить все ордера клиента
---------------------------

GET: http://domain.com/api/clients/:id/orders

> Params:
> states - список статусов ордеров через запятую.
> 
> Response:
> 200: Array, [{Order}, ...] - array of Orders objects
> 
> Errors:
> 401: "Unauthorized"



Получить подписчиков
---------------------

GET: http://domain.com/api/clients/:id/subscribers
> Response:
> 200: Array, [{Client}, ...] - array of Clients objects
> 
> Errors:
> 400: "protect for subscriber" - при попытке применить запрос к клиенту типа "consumer"
> 
> 401: "Unauthorized"


Получить поставщиков
--------------------

GET: http://domain.com/api/clients/:id/providers
> Response:
> 200: Array, [{Client}, ...] - array of Clients objects
> 
> Errors:
> 400: "protect for provider" - при попытке применить запрос к клиенту типа "provider"
> 401: "Unauthorized"


Закрыть ордер
-------------
Только для провайдера.
Будут закрыты все связанные ордера для всех подписчиков.
POST: http://domain.com/api/clients/:id/closeOrder

Открыть ордер
--------------
POST: http://domain.com/api/clients/:id/closeOrder

Только для провайдера.
Будут открыты связанные ордера для всех подписчиков.




Подписаться на сделки провайдера
--------------------------------
POST: http://domain.com/api/clients/:id/subscribe

Есть два варианта подписки: 
imediate = true - все открытые ордера провайдера будут скопированы и открыты.
imediate = false - будут копироваться только следующие оредра провайдера.



Отписаться от провайдера
------------------------
POST: http://domain.com/api/clients/:id/unsubscribe

Есть два варианта отписки:
imediate = true - все открытые сделки скопированные от данного провайдера будут закрыты сразу.
imediate = false - открытые сделки от данного провайдера продолжат следить за сделками провайдера и будут закрыты синхронно.


Добавить нового клиента:
------------------------
POST: http://domain.com/api/clients

> Body: 
> {field:value, ...}
> 
> Response:
> 200: {Client} - добавленный документ
> 
> Errors:
> 400: "bad request" - не достаточно данных или данные не верные
> 401: "Unauthorized"



Изменить данные клиента:
------------------------

PUT: http://domain.com/api/clients

> Body:
> {field:value, ...}
> 
> Response:
> 200: {Client} - модифицированный документ
> 
> Errors:
> 400: "bad request" - не допустимые данные
> 401: "Unauthorized"



Удалить клиента:
----------------
DELETE: http://domain.com/api/clients/:id
> Body:
> none
> 
> Response:
> 200: "success" - подтверждение удаления документа
> 
> Errors:
> 404: "not found" - документ для удаления не найден
> 401: "Unauthorized"

При удалении терминала - провайдера будут закрыты все открытые ордера клиента.


Orders
======



Terminals
=========

http:/domain.com/api/terminals