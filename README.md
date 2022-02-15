# ae-code-generation

Генерация JS кода для композиции After Effects 

В репозитории содержатся 2 скрипта.

## GenerateJSON.jsx

Данный скрипт - для After Effects. Он генерирует JSON файл, содержащий информацию
о композиции и её слоях.

Файл нужно поместить сюда `C:\Program Files\Adobe\Adobe After Effects 2022\Support Files\Scripts\ScriptUI Panels`.
и перезапустить After Effects. 

Для скрипта нужно в After Effects выставить настройку "Scripting & Expressions" > 
Allow Scripts to Write Files and Access Network.

Вызвать скрипт можно через Window > GenerateJSON (должно вылезти пустое окно, а в файле проекта
появится JSON файл).

## animationsCodeGen.js

Node.js скрипт, который сгенерирует код для анимаций.

Запускать так:

```
node animationsCodeGen.js json_файл_из_ae.json
```

## Что есть сейчас?

* Анимации прозрачности
* Вращения
* Перемещения
* Масштабирования

Перемещение и масштабирование пока всегда использует XY даже если вторая координата
не меняется (надо будет поправить).
