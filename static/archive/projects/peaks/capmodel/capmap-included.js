function drawEvalResults(selector, capfile, resultsfile) {

var width = "300",
	height = "900";

console.debug(selector);
console.debug(d3.select(selector));

var svg = d3.selectAll(selector).append("svg")
 .attr('xmlns', 'http://www.w3.org/2000/svg')
 .attr("width", width)
 .attr("height", height);

var parser = d3.dsv(";", "text/plain");

var caps;

parser(capfile, function(d) { 
	return { 
		fullname: d.full,
		shortname: d.sh
	};
}, function (error, rows) {
	drawForCaps(rows);
});


function drawForCaps(caps) {
	var commaParser = d3.dsv(",", "text/plain");
	parser(resultsfile, function(d) {
		return {
			project: d.project,
			peaks: d3.set(d.peaks.split(",")),
			docs: d3.set(d.docs.split(","))
		}
	}, function(error, rows) {
		drawEvaluation(rows, caps);
	});
}

function drawEvaluation(results, caps) {
	// sort results by project name
	results.sort(function(a,b) { 
		if (a.project > b.project) return 1;
		if (a.project < b.project) return -1;
		return 0;
	});

	//results = results.filter(function(r) { if (r.project == 'antlr' || r.project == 'geotools') return true; return false; });

	var matrix = results.map(function(r) {
		return {
			project: r.project,
			total: function() {
				var result = 0;
				this.caps.forEach(function(c) { if (c == "docs" || c == "both" || c == "") result++; });
				return result;
			}, 
			misses: function() {
				var result = 0;
				this.caps.forEach(function(c) { if (c == "docs") result++; });
				return result;
			}, 
			hits: function() {
				var result = 0;
				this.caps.forEach(function(c) { if (c == "both" || c == "") result++; });
				return result;
			}, 
			excess: function() {
				var result = 0;
				this.caps.forEach(function(c) { if (c == "peaks") result++; });
				return result;
			},
			missRate: function() {
				if (this.total() == 0) return 0;
				return this.misses() / this.total();
			},
			hitRate: function() {
				if (this.total() == 0) return 0;
				return this.hits() / this.total();
			},
			excessRate: function() {
				if (this.total() == 0) return 0;
				return this.excess() / this.total();
			},
			caps: caps.map(function(cap) {
				if (r.peaks.has(cap.fullname) && r.docs.has(cap.fullname)) return "both";
				if (r.peaks.has(cap.fullname)) return "peaks";
				if (r.docs.has(cap.fullname)) return "docs";
				return "";
			})
		}
	});

	var pFormat = d3.format(".2%");

	var hitRates = matrix.map(function(m) {return m.hitRate(); });
	var meanHitRate = Math.pow( hitRates.reduce(function(previousValue, currentValue, index, array) { return previousValue * currentValue; }) , (1.0 / hitRates.length) );

	var missRates = matrix.map(function(m) {return m.missRate(); });
	var meanMissRate = Math.pow( missRates.reduce(function(previousValue, currentValue, index, array) { if (currentValue == 0) return previousValue * 0.001; return previousValue * currentValue; }) , (1.0 / missRates.length) );

	var excessRates = matrix.map(function(m) {return m.excessRate(); });
	var meanExcessRate = Math.pow( excessRates.reduce(function(previousValue, currentValue, index, array) {  if (currentValue == 0) return previousValue * 0.001; return previousValue * currentValue; }) , (1.0 / excessRates.length) );

	var capFreq = caps.map(function(c) {
		return {
			shortname: c.shortname,
			fullname: c.fullname,
			empties: results.filter(function(r) { return (!r.peaks.has(c.fullname) && !r.docs.has(c.fullname)); }).length,
			both: results.filter(function(r) { return (r.peaks.has(c.fullname) && r.docs.has(c.fullname)); }).length,
			peaks: results.filter(function(r) { return (r.peaks.has(c.fullname) && !r.docs.has(c.fullname)); }).length,
			docs: results.filter(function(r) { return (!r.peaks.has(c.fullname) && r.docs.has(c.fullname)); }).length,
			total: function() { return this.both + this.docs + this.empties; },
			hitRate: function() {return (this.both + this.empties) / this.total(); },
			missRate: function() {return this.docs / this.total(); },
			excessRate: function() {return this.peaks / this.total(); }
		}
	});


	var legend = svg.selectAll("text")
					.data(caps)
					.enter().append("text")
					.text(function(d) {return d.shortname; })
					.attr("text-anchor", "middle")
					.attr("font-family", "Helvetica")
    				.attr("font-size", "8px")
    				.attr("y", 16)
    				.attr("x", function(d, i) { return 140 + (i * 12) });

	var projectArea = svg.selectAll("g")
    					 .data(matrix)
    					 .enter().append("g")
    					 .attr("transform", function(d,i) { return "translate(0, " + (20  + (i * 12)) +")" });

    var text = projectArea.append("text")
    					  .attr("text-anchor", "end")
    					  .attr("x", 130) // 275 
    					  .attr("y", 8)
    					  .attr("font-family", "Helvetica")
    					  .attr("font-size", "10px")
    					  .text(function(d) { return d.project; });	

/*
   var hitRate = projectArea.append("text")
    					  .attr("text-anchor", "end")
    					  .attr("x", 310 + caps.length * 12)
    					  .attr("y", 8)
    					  .attr("font-family", "Helvetica")
    					  .attr("font-size", "5px")
    					  .text(function(d) { return pFormat(d.hitRate()); });	

    var missRate = projectArea.append("text")
    					  .attr("text-anchor", "end")
    					  .attr("x", 330 + caps.length * 12)
    					  .attr("y", 8)
    					  .attr("font-family", "Helvetica")
    					  .attr("font-size", "5px")
    					  .text(function(d) { return pFormat(d.missRate()); });	
*/
    var points = projectArea.selectAll("g")
    					   .data(function(d) { return d.caps; })
    					   .enter()
    					   .append("g");


    var rects = points.append("rect")
    					   .attr("width", "10")
    					   .attr("height", "10")
    					   .attr("fill", function(d) { 
								if (d == "both") return "rgb(180, 222, 157)"; 
								if (d == "peaks") return "rgb(156, 179, 222)";
								if (d == "docs") return "rgb(245, 171, 168)";
    					   		return "white"; })
    					   .attr("x", function(d, i) { return 135 + (i * 12); })
    					   .attr("y", 0);	

    var symbols = points.append("text")
    						 .attr("text-anchor", "middle")
							 .attr("font-family", "Helvetica")
    						 .attr("font-size", "8px")
    						 .text(function(d) { 
    					   		if (d == "both") return "="; 
    					   		if (d == "peaks") return "+";
    					   		if (d == "docs") return "–"
    					   		return ""; })
    						 .attr("x", function(d, i) { return 140 + (i * 12); })
    					   	 .attr("y", 7);		


   	var totalEquals = svg.append("g")
   						.attr("transform", "translate(0, " + (20  + (matrix.length * 12)) +")" );

   	var totalElabel = totalEquals.append("text").attr("text-anchor", "end").attr("x", 115).attr("y", 8).attr("font-family", "Helvetica").attr("font-size", "10px").text("total");	
   	var totalErect = totalEquals.append("rect")
    					   .attr("width", "10")
    					   .attr("height", "10")
    					   .attr("fill", "rgb(180, 222, 157)")
    					   .attr("x", 120)
    					   .attr("y", 0);	
    var totalEsymbol = totalEquals.append("text")
    						 .attr("text-anchor", "middle")
							 .attr("font-family", "Helvetica")
    						 .attr("font-size", "8px")
    						 .text("=")
    						 .attr("x", 125)
    					   	 .attr("y", 7);	
    

   	var totalEarea = totalEquals.selectAll("g").data(capFreq).enter().append("g");
   	var totalEs = totalEarea.append("text")
    						 .attr("text-anchor", "end")
							 .attr("font-family", "Helvetica")
    						 .attr("font-size", "8px")
    						 .text(function(d,i) {return d.both;})
							 .attr("x", function(d, i) { return 144 + (i * 12); })
    					   	 .attr("y", 7);	
	

   	var totalMisses = svg.append("g")
   						.attr("transform", "translate(0, " + (20  + ((matrix.length + 1) * 12)) +")" );

   	var totalMlabel = totalMisses.append("text").attr("text-anchor", "end").attr("x", 115).attr("y", 8).attr("font-family", "Helvetica").attr("font-size", "10px").text("total");	
   	var totalMrect = totalMisses.append("rect")
    					   .attr("width", "10")
    					   .attr("height", "10")
    					   .attr("fill", "rgb(245, 171, 168)")
    					   .attr("x", 120)
    					   .attr("y", 0);
    var totalMsymbol = totalMisses.append("text")
    						 .attr("text-anchor", "middle")
							 .attr("font-family", "Helvetica")
    						 .attr("font-size", "8px")
    						 .text("-")
    						 .attr("x", 125)
    					   	 .attr("y", 7);


   	var totalMarea = totalMisses.selectAll("g").data(capFreq).enter().append("g");
   	var totalMs = totalMarea.append("text")
    						 .attr("text-anchor", "end")
							 .attr("font-family", "Helvetica")
    						 .attr("font-size", "8px")
    						 .text(function(d,i) {return d.docs;})
							 .attr("x", function(d, i) { return 144 + (i * 12); })
    					   	 .attr("y", 7)
    					   	 .attr("width","23px");


   	var totalExceeds = svg.append("g")
   						.attr("transform", "translate(0, " + (20  + ((matrix.length + 2) * 12)) +")" );				   
   	var totalExlabel = totalExceeds.append("text").attr("text-anchor", "end").attr("x", 115).attr("y", 8).attr("font-family", "Helvetica").attr("font-size", "10px").text("total");	

   	var totalExrect = totalExceeds.append("rect")
    					   .attr("width", "10")
    					   .attr("height", "10")
    					   .attr("fill", "rgb(156, 179, 222)")
    					   .attr("x", 120)
    					   .attr("y", 0);	
    var totalExsymbol = totalExceeds.append("text")
    						 .attr("text-anchor", "middle")
							 .attr("font-family", "Helvetica")
    						 .attr("font-size", "8px")
    						 .text("+")
    						 .attr("x", 125)
    					   	 .attr("y", 7);	


   	var totalExarea = totalExceeds.selectAll("g").data(capFreq).enter().append("g");

   	var totalExs = totalExarea.append("text")
    						 .attr("text-anchor", "end")
							 .attr("font-family", "Helvetica")
    						 .attr("font-size", "8px")
    						 .text(function(d,i) {return d.peaks;})
							 .attr("x", function(d, i) { return 144 + (i * 12); })
    					   	 .attr("y", 7)
    					   	 .attr("width","23px");

}

}
