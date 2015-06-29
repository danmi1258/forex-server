User
====
username {}
password {}
token {}

Client
======
subscriptions : Array : {providerId, volume} - список id поставщиков сигналов
openOrders : Array : {providerId}  - список id открытых ордеров текущим терминалом
closedOrders : Array - список закрытых ордеров, а также параметры сделки (прибыль, просадки и т.п.)
token : String - ссылка на токен

Order
=====
...orderParams - список полей - параметров сделки (из терминала)
openOn {Datetime} - время открытия
closeOn {Datetime} - время закрытия
provider String - ид провайдера, открывшего сделку

Token
=====
token {string} - токен
closed {datetime} - время закрытия
type {string} - provider, consumer, user
