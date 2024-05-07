# Timeline.js

This module draws a timeline diagram, using SVG to link entries.

## Use

To use the timeline:

* Include [`timeline.min.js`](dist/timeline.min.js) and [`timeline.min.css`](dist/timeline.min.js) in your document.
* Optionally include [`timeline-dark.min.js`](dist/timeline-dark.min.js) to enable the default [dark mode](#dark-mode).
* Add a `<div>` with `id="diagram"` to your HTML.
* Add your timeline entries and events as `<div>` elements within `div#diagram`, with the appropriate `data-` attributes (see [HTML](#html) below).
* Instantiate a new Timeline in JS, and call the `create()` method on it.

### Example

Here is an example showing the development of Linux Desktop Environments since the mid-1990s.

Entries are created using HTML `data` attributes, which determine their position and connections when the timeline is instantiated. Events can also be added, either to a particular entry or as a general event on the timeline.

```html

<div id="diagram">
	<!--Timeline entries-->
	<div id="KDE" data-start="1996" data-become="Plasma" data-colour="#179af3">KDE</div>
	<div id="Plasma" data-start="2014" data-colour="#179af3">KDE Plasma</div>
	<div id="Trinity" data-start="2010" data-split="KDE" data-colour="#01306f">Trinity Desktop Environment</div>
	<div id="Budgie" data-start="2014" data-split="GNOME" data-row="2" data-colour="#6bca81">Budgie</div>
	<div id="GNOME" data-start="1997" data-row="3" data-colour="#000">GNOME</div>
	<div id="Cinnamon" data-start="2013" data-split="GNOME" data-colour="#dc682e">Cinnamon</div>
	<div id="MATE" data-start="2011" data-split="GNOME" data-colour="#9ddb60">MATE</div>
	<div id="XFCE" data-start="1997" data-colour="#00a8dd">XFCE</div>
	<div id="LXDE2" data-start="2013" data-split="LXDE" data-irregular="true" data-row="7" data-colour="#d1d1d1">LXDE</div>
	<div id="LXDE" data-start="2006" data-become="LXQT" data-row="8" data-colour="#d1d1d1">LXDE</div>
	<div id="LXQT" data-start="2013" data-row="8" data-colour="#0280b9">LXQT</div>
	<div id="Razor-qt" data-start="2010" data-merge="LXQT" data-row="9" data-end="2013" data-colour="#006c96">Razor-qt</div>
	<div id="Enlightenment" data-start="1997" data-colour="#fff078">Enlightenment</div>
	<div id="Moksha" data-start="2014" data-split="Enlightenment" data-colour="#5a860a">Moksha Desktop</div>
	
	<!--Events-->
	<div class="event" data-year="2004">X.org is founded as a fork of XFree86.</div>
	<div class="event" data-year="2008">The Wayland project was started.</div>
	<div class="event" data-year="2011" data-target="GNOME">Gnome 3.0 was released.</div>
	<div class="event" data-year="2008" data-target="KDE">KDE 4 was released.</div>
</div>
```

```javascript

const example = new Timeline("diagram", { 
	yearStart: 1995
});
example.create();
```

This is rendered as below:

![A timeline diagram showing the development of Linux Desktop Environments. Years are shown at intervals along the top and bottom, increasing from left to right. Entries (e.g. KDE, Gnome, XFCE) are depicted with a box, bordered with the entry's brand colour, from which a line extends to the right representing the length of its existence. Some entries split from or merge with others, represented by a connecting line.](./images/example.png)

### Live examples

* [Electoral Parties in the Republic of Ireland](https://aonrud.github.io/Irish-Electoral-Parties/)
* [Timeline of the Irish Left](https://www.leftarchive.ie/page/timeline-of-the-irish-left/) on the Irish Left Archive

## Javascript

The script is bundled as an ES6 module ([`dist/timeline.esm.js`](dist/timeline.esm.js)) or a UMD ([`dist/timeline.min.js`](dist/timeline.min.js)), depending on your preferred development stack or build tools.

The Timeline class and configuration [are documented below](#javascript-documentation).  Note that configuration is optional - any or none of the options can be passed in the config object. If specifying a config, you must also pass the container ID as the first parameter when creating the timeline.

## Adding Entries

Entries can be defined either in your HTML using `data` attributes, or passed as an array of Javascript objects when instantiating Timeline.js.

Both methods can be combined, but any entry defined in JS that duplicates an existing `id` will be dropped and a warning sent in the console.

**Each entry must have a unique ID, which must be a valid value for the HTML `id` attribute (See [id on MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/id) for restrictions)**.

### HTML

To define entries in your HTML, create an element within the container and define its properties with the data attributes in the table below.

By default, entries should be `<div>` elements and the container has the id `#diagram`, but both of these are configurable (see [the Javscript configuration below](#timeline)).

|Attribute	|Required	|Value	|Use	|
|-----------|-----------|-------|-------|
|data-start|Yes|`<number>` A year|The year the entry starts at in the timeline. <br /> *Note: If this is earlier than the start of the timeline itself, an arrow is added to indicate it pre-exists the period shown.*|
|data-end|No|`<number>` A year|The year the entry ends. If omitted, this will be determined either by other connections, or if there are none, it will continue to the end of the timeline.|
|data-row|No|`<number>`| *Note: The first row is '0'*. <br />The row number this entry should appear in. This can be omitted, though automatic positioning is quite basic. It is recommended to use manual positioning or a combination of both for large or complex diagrams (see [Entry Positioning](#entry-positioning) below).|
|data-end-estimate|No|true or false|Whether the end is an estimate. Estimated end times are shown with a dashed end to the line, instead of a point.|
|data-become|No|Another entry ID|The entry 'becomes' another entry. I.e. another entry is the continuation of this entry, and it will be drawn on the same line.  For example, use this when an entry changes its name.|
|data-split|No|Another entry ID|If specified, the entry will be shown branching from the specified entry, at the year specified in 'data-start'.|
|data-merge|No|Another entry ID|If specified, the entry will be connected to the specified entry, at the year specified in 'data-end'.|
|data-links|No|A space-separated list of entry IDs|If specified, the entry is linked with a dashed line to each entry ID. Useful for looser associations between entries that should not be connected directly.|
|data-colour|No|A CSS colour value|The colour of the border around the entry and connections from it. |
|data-irregular|No|true or false|Set to true for entries that are 'irregular' or should not be unbroken from their start to end dates. If set to true, the entry will be drawn with a broken line.|
|data-group|No|<string>|A named group to which this entry belongs. This can be useful, for example, to keep entries that are not directly connected but have some shared property near each other in the diagram.|

### Javascript 

Entries can also be added using an array of objects when creating the Timeline, using an optional parameter.

Each entry must have at least `id`, `name` and `start` properties. The `name` is the displayed name of the entry (determined by the inner text of the element when defining entries in HTML).

All [attributes available as data attributes described above](#html) can be defined as object properties, with the omission of the data prefix and the object key named as it would be when converted from a data attribute to a property of the element's `dataset`. ([See the MDN entry for this conversion](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset#name_conversion)).

For example:

```javascript
const data = [
	{ id: "A", name: "First entry", start: 1950, end: 1960, merge: "B" },
	{ id: "B", name: "Second entry", start: 1955, end: 1981, endEstimate: true  },
	…
	{ id: "Z", name: "Final entry", start: 1940 }
];

const example = new Timeline(
	"diagram",
	{}, //Default configuration
	data
);

example.create();
```

## Adding Events

Two kinds of events can be added to the timeline:

1. general events appearing on the date line at the top of the diagram;
2. entry-specific events, appearing on an entry's own timeline.

These create information points that are expanded by hovering or touching. (See the [example screenshot](#examples) above or the [live examples](#live-examples).) As with entries, they can be added either with HTML `data` attributes or in Javascript.

### HTML

Events are added by creating a `<div>` with the class `event` and the required attributes.

|Attribute	|Required	|Value	|Use	|
|-----------|-----------|-------|-------|
|data-year  |Yes|<number> A year| Determines where on the timeline the event appears.|
|data-target|No|<string> An entry ID| If defined, places the event on an entry's line instead of the top date line.|
|data-colour|No|A CSS colour value| Defines the colour of the text of the event. For general events (no target entry) this also defines the colour of the information marker on the date line.|

### Javascript

As with entries, events can also be added using an array of objects in Javascript.

Each event must have at least `year` and `content` properties. The content provides the message shown for the event (determined by the inner text of the element when defining events in HTML).

In addition, if a valid entry id is provided in the `target` property, it will be displayed as an entry-specific event.

## CSS Styling

The variables below are set in the included CSS. These are the default values, and can be over-ridden to customise the timeline's appearance.

```CSS
--tl-colour-background: #fff;
--tl-colour-border: #ccc;
--tl-colour-stroke: #999;
--tl-colour-entry: #f2f2f2;
--tl-colour-text: #333;
--tl-colour-highlight: #FFF14D;
--tl-colour-background-feature: #fafafa;
--tl-colour-border-feature: #7a7a7a;
--tl-width-year: 50px;
--tl-width-box: 100px;
--tl-width-box-min: 40px;
--tl-height-box: 40px;
--tl-height-row: 50px;
--tl-padding: 5px;
```

### Dark mode

If you want to include a dark mode, you can link the additional [`timeline-dark.min.css`](timeline-dark.min.css) file in your HTML. This over-rides the above for users who have set a dark mode preference, as below.

```CSS
--tl-colour-background: #222;
--tl-colour-border: #282828;
--tl-colour-stroke: #777777;
--tl-colour-entry: #555555;
--tl-colour-text: #eeeeee;
--tl-colour-highlight: #FFF14D;
--tl-colour-background-feature: #333333;
--tl-colour-border-feature: #7a7a7a;
```

Alternatively, add your own preferences within a `prefers-color-scheme: dark` media query.

## Panning and Zooming

For large diagrams, Timeline can make use of [@panzoom/panzoom](https://github.com/timmywil/panzoom) to add panning and zooming to the diagram within a fixed container. Include `@panzoom/panzoom` in your dependencies (it is not bundled), and pass the panzoom function in the config when instantiating the timeline (see [Javascript Options](#javascript) below).

## Controls and searching

If Panzoom is active, controls can be added to find an entry and pan to it, and also to control the zoom.

### Find an Entry

Include a form with the id "timeline-find" (by default - this is configurable) containing an input with the name "finder".
The input will then provide an autocomplete list of the entries in the diagram, which, when selected, will trigger the diagram to pan to that entry and highlight it.

### Zoom controls

Buttons can be added to control 'zoom in', 'zoom out' and 'reset zoom' with specified IDs.  If not specified in the configuration, the zoom actions are attached to these IDs, if present in the document: 'timeline-zoom-in', 'timeline-zoom-out', 'timeline-zoom-reset'.

### Finding on load with URL hash

If a URL hash is present on load and Panzoom is enabled, the timeline will pan to and highlight a given entry automatically if the hash is in the format `#find-{id}`.

### Example

An example putting these together as a controls `<div>` within the diagram.

The provided classes will position the controls in a box in the bottom right corner of the timeline container.

```html
<div class="controls">
	<form id="timeline-find">
			<input type="text" name="finder" 
				placeholder="Type to find an entry" aria-label="Find an entry" />
	</form>
	<div class="zoom-buttons" role="group" aria-label="Diagram Zoom Controls">
		<button id="timeline-zoom-out" type="button">Zoom Out</button>
		<button id="timeline-zoom-reset" type="button">Reset</button>
		<button id="timeline-zoom-in" type="button">Zoom In</button>
	</div>
</div>

```

Alternatively, use a `<details>` element instead of `<div>` to make a collapsible controls box with a simple transition applied.

```html
<details class="controls">
	<summary>Search</summary>
	…
</details>

```

## Entry Positioning

The X axis position of each entry is manually set by specifing the 'data-start' attribute *(**note:** If `data-start` is before the configured start of the timeline, it will be shown at the start with an arrow indicating it pre-exists the period shown)*. The extent of the entry along the timeline is determined either by the 'data-end' attribute, or extends to the end of the timeline.

Specifying the row manually for each entry is not required. However, only some basic tests are performed to choose a suitable row for each entry when it is not specified, so aside from simple examples, it is recommended to manually set 'data-row' on a proportion of entries and those with complex links to ensure a sensible layout.

The row is determined for each entry if it is omitted, in the order that they appear (either source-code order if added in HTML, or their array order if added via Javascript). A row is determined as follows:

* Available space, starting from the centre of the diagram.
* Connected entries (via 'data-becomes' attribute) must be on the same row.
* Split and merge entries should aim to be as close to their linked entries as possible, depending on nearest available space.

### Groups

If any groups have been specified, the same logic is applied, but to entries matching each group separately. The groups are then positioned on the diagram one after the other. Grouped and un-grouped entries can be mixed: any ungrouped entries will be positioned in an available space after all groups are completed.

## Javascript Documentation

<a name="Timeline"></a>

### Timeline
The class representing the Timeline.  This is the point of access to this tool.
The simplest usage is to instantiate a new Timeline object, and then call the create() method.

**Kind**: global class  
* [Timeline](#Timeline)
    * [new Timeline([container], [config], [entries], [events])](#new_Timeline_new)
    * [timeline.create()](#Timeline+create)
    * [timeline.panToEntry(id)](#Timeline+panToEntry)
    * ["timelineFind"](#Timeline+event_timelineFind)

<a name="new_Timeline_new"></a>

#### new Timeline([container], [config], [entries], [events])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [container] | <code>string</code> | <code>&quot;diagram&quot;</code> | The ID of the container element for the timeline. |
| [config] | <code>object</code> |  | All config for the timeline |
| [config.panzoom] | <code>function</code> \| <code>null</code> | <code></code> | The Panzoom function to enable panning and zooming, or null to disable |
| [config.findForm] | <code>string</code> | <code>&quot;timeline-find&quot;</code> | The ID of the find form |
| [config.zoomIn] | <code>string</code> | <code>&quot;timeline-zoom-in&quot;</code> | The ID of the button to zoom in |
| [config.zoomOut] | <code>string</code> | <code>&quot;timeline-zoom-out&quot;</code> | The ID of the button to zoom out |
| [config.zoomReset] | <code>string</code> | <code>&quot;timeline-zoom-reset&quot;</code> | The ID of the button to reset the zoom level |
| [config.yearStart] | <code>number</code> | <code>1900</code> | the starting year for the timeline |
| [config.yearEnd] | <code>number</code> | <code>Current year + 1</code> | the end year for the timeline |
| [config.strokeWidth] | <code>number</code> | <code>4</code> | the width in px of the joining lines |
| [config.yearWidth] | <code>number</code> | <code>50</code> | the width in px of diagram used for each year |
| [config.rowHeight] | <code>number</code> | <code>50</code> | the height in px of each diagram row |
| [config.padding] | <code>number</code> | <code>5</code> | the padding in px between rows |
| [config.boxWidth] | <code>number</code> | <code>100</code> | the width in px of each entry |
| [config.guides] | <code>boolean</code> | <code>true</code> | whether to draw striped guides at regular intervals in the timeline |
| [config.guideInterval] | <code>number</code> | <code>5</code> | the interval in years between guides (ignored if 'guides' is false) |
| [config.entrySelector] | <code>string</code> | <code>&quot;div&quot;</code> | the CSS selector used for entries |
| [entries] | <code>Array.&lt;object&gt;</code> | <code>[]</code> | The Timeline entries as an array of objects |
| [events] | <code>Array.&lt;object&gt;</code> | <code>[]</code> | Events as an array of objects |

<a name="Timeline+create"></a>

#### timeline.create()
Create the Timeline. This should be called after instantiation.

**Kind**: instance method of [<code>Timeline</code>](#Timeline)  
**Access**: public  
<a name="Timeline+panToEntry"></a>

#### timeline.panToEntry(id)
If Panzoom is enabled, pan to the element with the given ID, and reset the zoom.

**Kind**: instance method of [<code>Timeline</code>](#Timeline)  
**Emits**: [<code>timelineFind</code>](#Timeline+event_timelineFind)  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | The ID of a timeline entry |

<a name="Timeline+event_timelineFind"></a>

#### "timelineFind"
The timelineFind event is fired when panToEntry() is called. (Only applicable if Panzoom is enabled).

**Kind**: event emitted by [<code>Timeline</code>](#Timeline)  
**Access**: public  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| details | <code>object</code> |  |
| details.id | <code>string</code> | the ID of the entry |
| details.name | <code>string</code> | the name of the entry |



* * *

## Licence

Copyright (C) 2021-24 Aonghus Storey

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

See the [`LICENCE`](LICENCE) file for details.
