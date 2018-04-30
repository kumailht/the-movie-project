// Developed by Kumail Hunaid

// Should preferably be a secret
var API_KEY = '0ed87398ff75326c8d57dd31f3f44535';

// Useful for testing
var DISABLE_CACHING = false;

// takes template (string) and dict(object literal)
// each key is a variable in the template defined as {{ variable }}
// the function returns the template with all the variables replaced with thier respective values
function render(template, dict) {
	for (var i in dict) {
		var regex = new RegExp('\\{\\{ ' + i + ' \\}\\}', 'gi');
		template = template.replace(regex, dict[i]);
	}
	return template;
}

// Sort a list of elements and apply the order to the DOM.
// https://gist.github.com/mindplay-dk/6825439
jQuery.fn.order = function(asc, fn) {
	fn = fn || function(el) {
		return $(el).text().replace(/^\s+|\s+$/g, '');
	};
	var T = asc !== false ? 1 : -1,
		F = asc !== false ? -1 : 1;
	this.sort(function(a, b) {
		a = fn(a), b = fn(b);
		if (a == b) return 0;
		return a < b ? F : T;
	});
	this.each(function(i) {
		this.parentNode.appendChild(this);
	});
};

// Holds the Movie Project Application
var TheMovieProjectHome = {
	thumb_width: 200,
	start_year: 1927,
	end_year: new Date().getFullYear() + 1,

	init: function() {
		// initialize the API and setup templates and elements
		theMovieDb.common.api_key = API_KEY;

		this.el = {
			years_wrap: $('.years-wrap')
		}

		this.templates = {
			title: $('[template-name=title]').html(),
			year: $('[template-name=year]').html()
		}

		this.events();
	},

	// Cache AJAX requests in LocalStorage to avoid running over the API Rate limit
	getFromCache: function(name, key) {
		if (DISABLE_CACHING) return;
		return localStorage.getItem('cached_' + name + '_' + key);
	},
	setToCache: function(name, key, value) {
		if (DISABLE_CACHING) return;
		localStorage.setItem('cached_' + name + '_' + key, value);
	},

	maxNumberOfMoviesPerColumn: function() {
		// Determine the number of movies that will fit in a single column
		var max_width = this.el.years_wrap.width();
		return Math.floor(max_width / this.thumb_width) - 1;
	},

	unPackData: function(data) {
		data = JSON.parse(data);
		return data.results;
	},
	correctYearsOrdering: function(reverse) {
		// Because the movie results are loading asynchronously
		// The years might not load in the correct order, this
		// will correct and the sorting of DOM elements by year.
		this.el.years_wrap.find('.year').sortElements(function(first, second) {
			var first = parseInt($(first).attr('data-year'));
			var second = parseInt($(second).attr('data-year'));

			return first < second ? 1 : -1;
		});
	},
	renderMovie: function(movie_data) {
		// Render the HTML for a single movie
		return render(
			this.templates.title,
			{
				name: movie_data.title,
				thumb_url: movie_data.poster_path,
				id: movie_data.id
			}
		)
	},
	renderMovies: function(data) {
		// render a set of movies
		var that = this;
		var max_movies = this.maxNumberOfMoviesPerColumn();
		var all_movies_data = that.unPackData(data);
		var all_movies_html = '';

		$(all_movies_data).each(function(i, movie_data) {
			if (i >= max_movies) return false;
			all_movies_html += that.renderMovie(movie_data);
		});

		return all_movies_html;
	},
	insertYearOnPage: function(data, year) {
		// insert popular movies for a particular year
		var that = TheMovieProjectHome;
		var movies_html = that.renderMovies(data);

		that.el.years_wrap.append(
			render(that.templates.year, {
				year: year,
				titles: movies_html
			})
		);
	},
	fetchMovies: function(year) {
		// Fetch popular movies for a year and add them to the page
		var that = this;

		// Check if the data for this year has already been cached
		// in LocalStorage
		var cached_data = this.getFromCache('year', year);
		if (cached_data) {
			that.insertYearOnPage(cached_data, year)
			that.correctYearsOrdering();
			return;
		}

		// Get the most popular movies from The Movie Database
		// Movies that have a good score and many votes are
		// considered popular.
		theMovieDb.discover.getMovies(
			{
				'vote_average.gte': 6,
				'sort_by': 'vote_count.desc',
				'primary_release_year': year
			},

			function(data) {
				that.insertYearOnPage(data, year)
				that.correctYearsOrdering();
				that.setToCache('year', year, data);
			},

			function(data) {
				console.log("Error for " + year + ": " + data);
			}
		);
	},
	events: function() {
		var that = this;

		// For each year, fetch and load the most popular movies
		for (var year = this.end_year; year >= this.start_year; year--) {
			this.fetchMovies(year);
		};
	}
};

jQuery(document).ready(function() {
	TheMovieProjectHome.init();
});
