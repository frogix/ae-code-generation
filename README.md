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

```bash
node animationsCodeGen.js json_файл_из_ae.json
```

## Пример сгенерированного кода (для одного слоя)

Инициализация:

```js
l_udo = this._fSheeth_udo = this._getAssetContent(l_grsl, l_grsl.i_getSheethImgURL());
l_udo.i_setLocalBoundsXY(-61, -59);
l_udo.i_setXY(-22.5, 11);
l_udoc.i_addChild(l_udo);
```

Анимация:

```js
//SHEETH...
l_udo = this._fSheeth_udo;
l_gut.i_callHandlerAtTime(0, l_udo.i_setVisible.i_toObjectMethod(l_udo), [true]);
l_gut.i_callHandlerAtTime(1200, l_udo.i_setVisible.i_toObjectMethod(l_udo), [false]);
l_gut.i_addAnimation(l_udo, GUTimeline.i_SET_XY, [-22.5, 11],
	[
		6,
		[[-14.5, 5.5], 8],
		[[-104.5, -0.5], 3],
		[[-115, -2.5], 10],
		[[-22.5, 11], 23]
	]
);

l_gut.i_addAnimation(l_udo, GUTimeline.i_SET_ROTATION_IN_DEGREES, 0,
	[
		6,
		[29, 8],
		[-14.2, 3],
		[-24.1, 10],
		[6.1, 15],
		[0, 33]
	]
);

l_gut.i_addAnimation(l_udo, GUTimeline.i_SET_SCALE_XY, [1, 1],
	[
		6,
		[[0.89, 0.89], 8],
		[[1.12, 1.12], 3],
		[[1.12, 1.12], 10],
		[[1, 1], 23]
	]
);
//...SHEETH
```

## Что есть сейчас?

* Анимации прозрачности
* Вращения
* Перемещения
* Масштабирования

## Что можно добавить?

- [x] Переводить SCALE_XY в SCALE, SCALE_X, SCALE_Y, + аналогично для Position где это возможно
- [x] Интерпретировать одинаковые значения в кейфреймах как паузы
- [ ] Добавить Ease-параметры
- [ ] Пересмотреть код для setVisible (не добавлять его, если не нужно)
- [ ] Добавить парсинг и генерацию кода для режимов наложения (BlendingMode)
- [ ] Генерировать код для Resources Loader'a (м.б. генерировать patch-файлы, чтобы код сам вставлялся куда нужно)
- [ ] Добавить интерфейс
- [ ] Генерировать код для Wiggle и для других выражений (например, анимация бесконечного вращения)
