Умные заметки
=============

Отприска от провайдера может быть чреватой для открытых сделок
--------------------------------------------------------------

При отписке от провайдера (функция Client.unsubscribe ) id подписчика будет удален из списка Client.subscriptions 
При этом у подписчика могут быть открытые сделки. И когда провайдер закроет сделку, подписчик уже не узнает об этом. Что делать ?