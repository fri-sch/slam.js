/* Global resources for artists and rounds */
var db_api_url = window.location.origin + '/slam/data/';
var resArtists = { path: db_api_url + 'artists', name: 'artists' };
var resRounds = { path: db_api_url + 'rounds', name: 'rounds' };

/* Global variables to cache the data from the db */
var rounds, artists;

/**
 * Retrieves resource data from the database
 *
 * res:      Resource to get from the db
 * thenFunc: Function to run afterwards
 */
function slamlib_getRes(res, thenFunc) {
	return $.ajax({
		type: "GET",
		url: res.path,
		contentType: 'application/json',
		dataType: "json"
	}).then(thenFunc);
}

/**
 * Updates content with the given data
 *
 * res:  Resource to update
 * data: Data for the given resource
 * root: Root of context to update (defaults to ':root')
 */
function slamlib_update(res, data, root) {
	root = root ? root:":root";
	if (res.name === "rounds")
		rounds = data;
	else if (res.name === "artists")
		artists = data;

	let roundOverviews = $(root).find(
		"section.round-overview:not(.slide-background)");
	$(roundOverviews).html("");
	$.each(rounds, function(index, r) {
		// Fill round overviews
		$(roundOverviews).each(function() {
			if($(this).hasClass("round" + r.id)) {
				$(this).append("<div class='roundlist'>						\
									<h2>" + r.name + "</h2>					\
									<ol class='round" + r.id + "list'></ol>	\
								</div>										\
				");
			}
		});

		let roundlist = $(root).find("ol.round" + r.id + "list");
		let artistslides = $(root).find("section.artists.round" + r.id);
		let voteslide = $(root).find("section.vote.round" + r.id);
		let votechart = $(voteslide).find("ol.chart");

		if (res.name === "rounds" || $(roundlist).children().length == 0) {
			$(roundlist).html("");

			// Create slot list entries
			for(let i=0; i<r.num_slots; i++) {
				roundlist.append("<li class='slot" + i + "'></li>");
			}
		}

		if (res.name === "rounds" || $(artistslides).children().length == 0) {
			$(artistslides).html("");

			for(let i=0; i<r.num_slots; i++) {
				// Create artist slides
				if (r.rate_by_score) {
					$(artistslides).append("					\
						<section class='artist slot" + i + "'>	\
							<div class='head'>					\
								<h2 class='name'></h2>			\
								<div class='score'></div>		\
							</div>								\
							<div class='content'>				\
								<div class='points'>			\
								</div>							\
							</div>								\
						</section>								\
						<section></section>						\
					");
				} else {
					$(artistslides).append("					\
						<section class='artist slot" + i + "'>	\
							<div class='head'>					\
								<h2 class='name'></h2>			\
							</div>								\
						</section>								\
						<section></section>						\
					");
				}
			}
		}

		if (res.name === "rounds" || $(votechart).children().length == 0) {
			$(votechart).html("");

			for(let i=0; i<r.num_slots; i++) {
				// Create vote result chart
				if (r.rate_by_score) {
					$(votechart).append("								\
						<li class='fragment slot" + i + "'				\
								   data-fragment-index=" + i + " >		\
							<div class='left name'></div>				\
							<div class='bar'>							\
								<div class='right score'></div>			\
							</div>										\
						</li>											\
					");
				} else {
					$(votechart).append("								\
						<li class='fragment slot" + i + "'				\
								   data-fragment-index=" + i + " >		\
							<div class='left name'></div>				\
						</li>											\
					");
				}
			}
		}

		$.each(artists, function(index, a) {
			if (isArtistInRound(a, r.id)) {
				let slot = a["round" + r.id].slot - 1;
				// Fill slot lists with artist names
				$(roundlist).find(".slot" + slot).html(a.name);
				// Fill sub slides for each artist
				let points = a["round" + r.id].points;
				let score = slamlib_getScore(a, r.id);
				let slide = $(artistslides).find(".slot" + slot);
				$(slide).find(".name").html(a.name);
				$(slide).find(".score").html(score ? score:'');
				$(slide).find(".points").html("");
				for (let i=0; i<points.length; i++) {
					let crossed = ">"
					if (slamlib_isRatingCrossed(a, r.id, i))
						crossed = " class='crossed'>	\
										<div class='crossedCard'>X</div>";
					$(slide).find(".points").append("<span" + crossed +
														points[i] +
													"</span>");
				}
				// Fill vote results
				let chartentry = $(votechart).find(".slot" + slot);
				$(chartentry).find(".name").html(a.name);
				$(chartentry).find(".score").html(score ? score:'');
				$(chartentry).find(".bar").width(score / 70 * 75 + "%");
			}
		});
	});
}

/**
 * Filters a list of artists to return the ones assigned to a given round
 *
 * artists: List of artists
 * round:   Round to filter for
 */
function slamlib_filterArtistsByRound(artists, round) {
	return $.grep(artists, function(a, i) {
		return isArtistInRound(a, round.id);
	});
}

/**
 * Filters a list of artists to return the ones not assigned to a given round
 *
 * artists: List of artists
 * round:   Round to filter for
 */
function slamlib_filterArtistsByRoundInv(artists, round) {
	return $.grep(artists, function(a, i) {
		return !isArtistInRound(a, round.id);
	});
}

/**
 * Filters a list of artists to return the ones not assigned to a given level
 * (group of rounds)
 *
 * artists: List of artists
 * r_id:    ID of the level to filter for
 */
function slamlib_filterArtistsByLevelInv(artists, level) {
	return $.grep(artists, function(a, i) {
		return !isArtistInLevel(a, level);
	});
}

function isArtistInRound(a, r_id) {
	if(a["round" + r_id] && a["round" + r_id].slot > 0)
		return true;
	return false;
}

function isArtistInLevel(a, level) {
	let inLevel = false;

	$.each(rounds, function(index, r) {
		if(a["round" + r.id] &&
		   a["round" + r.id].slot > 0 &&
		   r.level == level) {
			inLevel = true;
			return false; // break loop
		}
	});

	return inLevel;
}

function slamlib_getScore(a, r_id) {
	if (!a["round" + r_id] || !a["round" + r_id].points)
		return false;

	let points = a["round" + r_id].points;
	let score = 0;

	for (let i=0; i<points.length; i++) {
		if (!slamlib_isRatingCrossed(a, r_id, i))
			score += points[i];
	}

	return score;
}

function slamlib_isRatingCrossed(a, r_id, r_idx) {
	if (!a["round" + r_id] || !a["round" + r_id].points[r_idx])
		return false;

	if (!a["round" + r_id].crossed)
		return false;

	let points = a["round" + r_id].points;
	let min = 11;
	let max = -1;

	for (let i=0; i<points.length; i++) {
		if (points[i] < min)
			min = points[i];
		if (points[i] > max)
			max = points[i];
	}

	let usedMin = false;
	let usedMax = false;

	for (let i=0; i<r_idx; i++) {
		if (!usedMin && points[i] === min)
			usedMin = true;
		else if (!usedMax && points[i] === max)
			usedMax = true;
	}

	if (!usedMin && points[r_idx] === min)
		return true;

	if (!usedMax && points[r_idx] === max)
		return true;

	return false;
}
