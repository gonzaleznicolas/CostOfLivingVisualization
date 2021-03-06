
let scatterIndexInfo = [
	{
		name: "Cost of Living Index",
		shortName: "Cost Living",
		color: getComputedStyle(g_root).getPropertyValue('--cost-living-color')
	},
	{
		name: "Rent Index",
		shortName: "Rent",
		color: getComputedStyle(g_root).getPropertyValue('--rent-color')
	},
	{
		name: "Groceries Index",
		shortName: "Groceries",
		color: getComputedStyle(g_root).getPropertyValue('--groceries-color')
	},
	{
		name: "Restaurant Price Index",
		shortName: "Restaurants",
		color: getComputedStyle(g_root).getPropertyValue('--restaurants-color')
	},
	{
		name: "Local Purchasing Power Index",
		shortName: "Purchasing Pwr",
		color: getComputedStyle(g_root).getPropertyValue('--purchasing-pwr-color')
	},
];

let bandScale;
let svgWidth = 780;
let svgHeight = 45;
let cityColumnWidth = 90;

function initializeScatterPlot(){

	bandScale = d3.scaleBand()
		.domain([
			"Cost of Living Index",
			"Rent Index",
			"Groceries Index",
			"Restaurant Price Index",
			"Local Purchasing Power Index"
		])
		.range([cityColumnWidth, svgWidth])
		.paddingInner(0.15)
		.paddingOuter(0.05);
	
	setUpAxes();

	$.subscribe("citySelected", onCitySelected_ScatterPlot);
	$.subscribe("cityDeselected", onCityDeselected_ScatterPlot);
	$.subscribe("citySelectionCleared", onCitySelectionCleared_ScatterPlot);
}

function setUpAxes(){
	let axesSvg = d3.select("#scatterAxesSvg")
		.attr("width", svgWidth)
		.attr("height", svgHeight);

	scatterIndexInfo.forEach( (index) => {
		index.scale = d3.scaleLinear()
			.domain([g_indexStats[index.name].min, g_indexStats[index.name].max])
			.range([bandScale(index.name), bandScale(index.name)+bandScale.bandwidth()])
			.nice();

		index.axis = d3.axisBottom(index.scale)
			.ticks(3);

		let range = index.scale.range();
		let middleX = (range[0] + range[1])/2;

		axesSvg.append("g")
			.attr("transform", "translate(0, 25)")
			.call(index.axis)
			.append("text")
			.classed("axis-label", true)
			.attr("x", middleX)
			.attr("y", -8)
			.style("text-anchor", "middle")
			.text(index.shortName);
	});
}

function onCitySelected_ScatterPlot(event, cityData) 
{
	let svg = d3.select("#scatterCitiesContainer")
		.append("svg")
		.style("opacity", 0)
		.attr("id", `scatterRow${cityData.Rank}`)
		.attr("class", "scatterCityRow")
		.attr("width", svgWidth)
		.attr("height", 20)
		.on("click", () => {
			$.publish("cityDeselected", cityData);
			$.publish("mouseOutOfCity", cityData);
		})
		.on("mouseover", () => {
			svg.classed("scatter-row-hovered", true);
			$.publish("mouseOverCity", cityData);
		})
		.on("mouseout", () => {
			svg.classed("scatter-row-hovered", false);
			$.publish("mouseOutOfCity", cityData);
		});

	svg.append("text")
		.classed("city-label", true)
		.style("text-anchor", "end")
		.attr("x", bandScale("Cost of Living Index") - 10)
		.attr("y", 15)
		.text(cityData.City);
	
	scatterIndexInfo.forEach(function (index) {
		svg.append("circle")
			.attr("fill", index.color)
			.attr("cx", index.scale(cityData[index.name]))
			.attr("cy", 10)
			.attr("r", 5);
	});

	svg.transition()
		.duration(1000)
		.style("opacity", 1);
}

function onCityDeselected_ScatterPlot(event, cityData) 
{
	d3.selectAll(`#scatterCitiesContainer #scatterRow${cityData.Rank}`)
		.transition()
		.duration(1000)
		.style("opacity", 0)
		.on("end", () => {d3.select(`#scatterCitiesContainer #scatterRow${cityData.Rank}`).remove();});
}

function onCitySelectionCleared_ScatterPlot(event) 
{
	d3.selectAll(`#scatterCitiesContainer .scatterCityRow`)
	.transition()
	.duration(1000)
	.style("opacity", 0)
	.on("end", () => {$("#scatterCitiesContainer").empty();});
}
