let mapSvg;
let mapGroup;
let mapHeight;
let mapWidth;
let mapProjection;
let mapPath;
let selectedIndex;
let mapColorScale;

function initializeMap(world_topoJSON_data, city_coordinates){

	addCoordinatesToCostOfLivingData(city_coordinates);
	drawMap(world_topoJSON_data);

	selectedIndex = $('#mapIndexSelector').val();

	$('#mapIndexSelector').on('change', changeIndexSelection);
	$("#clearSelectionButton").on("click", onClearSelection_Map);
	$.subscribe("citySelected", onCitySelected_Map);
	$.subscribe("cityDeselected", onCityDeselected_Map);
	$.subscribe("filtersUpdated", onFiltersUpdated);

	refreshPlottedCities();
}

function addCoordinatesToCostOfLivingData(city_coordinates){
	g_costOfLivingData;
	
	// add coordinates to cost of living data
	g_costOfLivingData.forEach(function(cityCostData){
		cityCords = city_coordinates.find(function(cityCoordinatesData){ return cityCostData.City == cityCoordinatesData.city_ascii && cityCostData.Country == cityCoordinatesData.country;});
		if (cityCords != undefined){	// if found lat and long
			cityCostData.lat = cityCords.lat; cityCostData.lng = cityCords.lng;
		}
		else {
			console.log(`Didn't find coordinates for: ${cityCostData.City}, ${cityCostData.Country}`);
		}
	});
}

function drawMap(world_topoJSON_data){
	mapHeight = 400;
	mapWidth = 950;
	
	// create projection using Mercator.
	// Converts a lattitude and longitude into a screen coordinate
	// according to the specified projection type
	mapProjection = d3.geoMercator()
		.translate([mapWidth/2, mapHeight/2+80])
		.scale((mapWidth - 1) / 2 / Math.PI);
	
	// create a path generator to translate from topoJSON geometry to SVG paths
	mapPath = d3.geoPath()
		.projection(mapProjection);
	
	const zoom = d3.zoom()
		.scaleExtent([1, 8])
		.on('zoom', zoomed);
	
	mapSvg = d3.select( "#map" )
		.attr( "width", mapWidth)
		.attr( "height", mapHeight);
	
	mapGroup = mapSvg.append("g");
	
	mapSvg.call(zoom);
	
	mapGroup.append('path')
		.datum({ type: 'Sphere' })
		.attr('class', 'sphere')
		.attr('d', mapPath);
	
	mapGroup.append('path')
		.datum(topojson.merge(world_topoJSON_data, world_topoJSON_data.objects.countries.geometries))
		.attr('class', 'land')
		.attr('d', mapPath);
	
	mapGroup.append('path')
		.datum(topojson.mesh(world_topoJSON_data, world_topoJSON_data.objects.countries, (a, b) => a !== b))
		.attr('class', 'boundary')
		.attr('d', mapPath);
}

function zoomed() {
	mapGroup.selectAll('path')
		.attr('transform', d3.event.transform);
	
	mapSvg.selectAll(".city-circle")
		.attr('transform', d3.event.transform)
		.attr('r', 2/Math.sqrt(d3.event.transform.k));
	
	g_root.style.setProperty('--selected-radius', `${4/Math.sqrt(d3.event.transform.k)}px`);
	g_root.style.setProperty('--selected-border-width', `${1/Math.sqrt(d3.event.transform.k)}px`);
}

function refreshPlottedCities(){
	computeColorScale();
	makeColorLegend(mapColorScale);

	let cityUpdateSelection = mapSvg.selectAll(".city-circle").data(g_costOfLivingData);

	let cityEnterSelection = cityUpdateSelection.enter();

	cityEnterSelection
		.append("circle")
		.attr("class", (d) => `city-circle id${d.Rank}`) // use Rank as an id for the city
		.on("click", onClickCity)
		.on("mouseover", onMouseOverCity_Map)
		.on("mouseout", onMouseOutOfCity_Map)
		.attr("r", 2)
		.merge(cityUpdateSelection)
		.attr("fill", d => mapColorScale(d[selectedIndex]))
		.attr("cx", function(d){
			let coords = mapProjection([d.lng, d.lat]);
			return coords[0];
		})
		.attr("cy", function(d){
			let coords = mapProjection([d.lng, d.lat]);
			return coords[1];
		})
		.attr('stroke','black')
		.attr('stroke-width','0.2px');

		cityUpdateSelection.exit()
		.remove();
	
	onFiltersUpdated(); // hide cities not matching filters
}

function onFiltersUpdated(){
	mapSvg.selectAll(".city-circle")
		.attr("display", (city) => {
			let thisCityPassesTest = doesThisCityPassAllFilters(city);
			if (thisCityPassesTest == true)
				return "";
			else{
				$.publish("cityDeselected", city);
				return "none";
			}
		});
}

// HELPER FUNCTIONS

function doesThisCityPassAllFilters(city){
	let passesAllFilters = true;

	g_indices.forEach( (index) => {
		if (!(g_filterValues[index].min <= city[index] && city[index] <= g_filterValues[index].max))
			passesAllFilters = false;
	});

	return passesAllFilters;
}

function computeColorScale(){
	mapColorScale = d3.scaleLinear()
		.domain([g_indexStats[selectedIndex].min, g_indexStats[selectedIndex].avg, g_indexStats[selectedIndex].max])
		.range([getComputedStyle(g_root).getPropertyValue('--cheap-city-color'),
				getComputedStyle(g_root).getPropertyValue('--average-city-color'),
				getComputedStyle(g_root).getPropertyValue('--expensive-city-color')
		]);
}
	
function onMouseOverCity_Map(d){
	d3.select(this).classed("mouseover", true);
	$.publish("mouseOverCity", d);
}

function onMouseOutOfCity_Map(d){
	d3.select(this).classed("mouseover", false);
	$.publish("mouseOutOfCity", d);
}

function onClickCity(d){
	let thisCity = d3.select(this);
	if (thisCity.classed("selected")){
		$.publish("cityDeselected", d);
	}
	else{
		$.publish("citySelected", d);
	}				
}

function getSelectedCitiesOnMap(){
	return d3.selectAll(".selected").data();
}

function changeIndexSelection(){
	selectedIndex = $(this).children("option:selected").val();
	refreshPlottedCities();
}

function onClearSelection_Map(){
	mapSvg.selectAll(".selected").classed("selected", false);
	$.publish("citySelectionCleared");
}

function onCitySelected_Map(event, cityData){
	d3.select(`.id${cityData.Rank}`).classed("selected", true);
}

function onCityDeselected_Map(event, cityData){
	d3.select(`.id${cityData.Rank}`).classed("selected", false);
}