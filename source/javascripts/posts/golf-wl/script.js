// creates array of matches 
// _.flatten(d3.values(data).map(function(d){ return d3.values(d); }))

var height = 500,
		width = 750,
		margin = {left: 20, right: 20, top: 20, bottom: 20};

var x = d3.scale.linear()
		.domain([0, 18])
		.range([0, width])

var y = d3.scale.linear()
		.domain([-9, 9])
		.range([height, 0])

var xTick = x(1),
		yTick = y(8);

var radiusScale = d3.scale.sqrt()
		.range([0, 10])

var lineWidthScale = d3.scale.linear()
		.range([0, 1, 8])

var color = d3.scale.category10();

var svg = d3.select('#golf-wl')
  .append('svg')
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

var holeConstrains = {"4":[1],"8":[-1, 3]},
		rounds = [],
		directions = ['down', 'same', 'up'],
		roundHash = {};

d3.range(0, 19).forEach(function(hole){
	d3.range(-9, 10).forEach(function(spread){
		if (9 - Math.abs(9 - hole) >= Math.abs(spread)){
			var round = {hole: hole, spread: spread};
			rounds.push(round);
			roundHash[hole + ':' + spread] = round;
		}
	})
})

var roundGs = svg.selectAll('.roundG')
		.data(rounds).enter()
	.append('g')
		.attr('transform', function(d){
			return ['translate(', x(d.hole), ',', y(d.spread), ')'].join(''); })

d3.json('flat-data.json', function(err, matches){
	//winner of the first match always on top -  do server side
	matches.forEach(function(match){
		var flip = false;
		match.scores.some(function(d){
			if (d < 0){ flip = true}
			return d != 0;
		})
		if (flip){ 
			match.scores = match.scores.map(function(d){ return -1*d; })
		}
	})

	function updateData(){
		rounds.forEach(function(d){
			directions.concat('count').forEach(function(str){ d[str] = 0 }) })

		var holeConstrainsArray = d3.entries(holeConstrains);

		matches.forEach(function(match){
			//don't count matches that don't meet constraints
			var meetsConstraints = holeConstrainsArray.every(function(d){
				//debugger;
				return _.contains(d.value, match.scores[d.key])
			})	
			if (!meetsConstraints) return

			match.scores.forEach(function(spread, hole){
				//var round = _.findWhere(rounds, {hole: hole, spread: spread});
				var round = roundHash[hole + ':' + spread]
				if (!round) return;
				round.count++;
				var nextSpread = match.scores[hole+1];
				if (isNaN(nextSpread)) return
				round[nextSpread < spread ? 'down' : nextSpread == spread ? 'same' : 'up']++;
			})
		})
	}
	updateData();

	function updateScales(){
		radiusScale.domain(d3.extent(rounds, f('count')))
		var maxLineVals = directions.map(function(str){ return d3.max(rounds, ƒ(str)) })
		lineWidthScale.domain([0, 1, d3.max(maxLineVals)])
	}
	updateScales();

	function firstDraw(){
		roundGs.selectAll('line')
				.data(function(d){
					return directions.map(function(str, i){
						return {type: str, direction: i - 1}
					}) })
				.enter()
			.append('line')
				.attr({x2: xTick})
				.attr('y2', function(d){ return d.direction*(-yTick)})

		roundGs.append('circle')

		roundGs.append('rect')
				.attr({x: -xTick/2, y: -yTick/2, width: xTick, height: yTick})
				.on('mouseover', function(d){
					d3.select(this).classed('hovered', true)
				})
				.on('mouseout', function(d){
					d3.select(this).classed('hovered', false)
				})
				.on('click', function(d){
					var selected = !d3.select(this).classed('selected')
					d3.select(this).classed('selected', selected)
					if (selected){
						if (holeConstrains[d.hole]){
							holeConstrains[d.hole].push(d.spread);
						} else{
							holeConstrains[d.hole] = [d.spread];
						}
					} else{
						holeConstrains[d.hole] = holeConstrains[d.hole]
							.filter(function(spread){ return spread != d.spread; })

						if (!holeConstrains[d.hole].length){
							delete holeConstrains[d.hole];
						}
					}

					updateData();
					updateScales();
					updateDOM();
				})
	}
	firstDraw();

	function updateDOM(){
		roundGs.selectAll('line')
				.data(function(d){
					return directions.map(function(str, i){
						return {type: str, count: d[str], direction: i - 1}
					}) })
				.style('stroke-width', _.compose(lineWidthScale, f('count')))
				.style('stroke', _.compose(color, f('type')))

		roundGs.select('circle')
				.attr('r', _.compose(radiusScale, f('count')))
	}
	updateDOM();
})