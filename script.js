const apiKey = "959d9451d7f23817254ee887e8245961"; // Zamenite sa svojim OpenWeatherMap API ključem

// Lista gradova za izbor
const europeanCities = [
    "Belgrade", "Knokke, BE", "Paris", "London", "Berlin", "Madrid", "Rome", "Vienna", "Athens", "Budapest", 
    "Prague", "Warsaw", "Dublin", "Brussels", "Amsterdam", "Lisbon", "Zurich", "Stockholm", 
    "Oslo", "Copenhagen", "Helsinki", "Sofia", "Bucharest", "Ljubljana", "Zagreb", "Podgorica", 
    "Sarajevo", "Skopje", "Tirana", "Sint-Pieters-Leeuw, BE", "Šabac, RS"
];

// Popunjavanje select elementa sa gradovima
const citySelect = document.getElementById("city-select");
europeanCities.forEach(city => {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    citySelect.appendChild(option);
});

// Funkcija za ažuriranje trenutnih podataka o vremenu
function updateWeather(city) {
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=fr`;
    
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Greška: ${response.status} - ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // Ažuriranje informacija o trenutnom vremenu
            document.getElementById("temperature").textContent = data.main.temp.toFixed(1);
            document.getElementById("humidity").textContent = data.main.humidity;
            document.getElementById("description").textContent = data.weather[0].description;
            document.getElementById("wind-speed").textContent = data.wind.speed.toFixed(1);
            const precipitation = data.rain ? data.rain["1h"] || 0 : 0;
            document.getElementById("precipitation").textContent = precipitation.toFixed(1);
            getUVIndex(data.coord.lat, data.coord.lon);
            getPollutionIndex(data.coord.lat, data.coord.lon);
            const iconCode = data.weather[0].icon;
            document.getElementById("weather-icon").src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        })
        .catch(error => console.error("Greška prilikom dohvatanja podataka:", error));
}

// Funkcija za dobijanje UV indeksa
function getUVIndex(lat, lon) {
    const apiUrl = `https://api.openweathermap.org/data/2.5/uvi?appid=${apiKey}&lat=${lat}&lon=${lon}`;
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            document.getElementById("uv-index").textContent = data.value.toFixed(1);
        })
        .catch(error => console.error("Greška prilikom dohvatanja UV indeksa:", error));
}

// Funkcija za dobijanje indeksa polucije
function getPollutionIndex(lat, lon) {
    const apiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?appid=${apiKey}&lat=${lat}&lon=${lon}`;
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            document.getElementById("pollution").textContent = data.list[0].main.aqi;
        })
        .catch(error => console.error("Greška prilikom dohvatanja indeksa polucije:", error));
}

// Funkcija za dobijanje vremenske prognoze za naredne dane
function getWeatherForecast(city) {
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric&lang=fr`;
    fetch(forecastUrl)
        .then(response => response.json())
        .then(data => {
            displayForecast(data);
        })
        .catch(error => console.error("Greška prilikom dohvatanja prognoze:", error));
}

// Funkcija za prikaz vremenske prognoze
function displayForecast(data) {
    const forecastList = document.getElementById("forecast-list");
    forecastList.innerHTML = ""; // Očisti prethodni prikaz

    // Prikaz prognoze na svakih 24 sata
    for (let i = 0; i < data.list.length; i += 8) {
        const dayData = data.list[i];
        const date = new Date(dayData.dt * 1000).toLocaleDateString("fr-FR", {
            weekday: "long", day: "numeric", month: "short"
        });
        const temp = Math.round(dayData.main.temp);
        const icon = `https://openweathermap.org/img/wn/${dayData.weather[0].icon}@2x.png`;
        const description = dayData.weather[0].description;

        const forecastItem = document.createElement("div");
        forecastItem.classList.add("forecast-item");
        forecastItem.innerHTML = `
            <p class="forecast-date">${date}</p>
            <img src="${icon}" alt="${description}" class="forecast-icon">
            <p class="forecast-temp">${temp}°C</p>
            <p class="forecast-desc">${description}</p>
        `;
        forecastList.appendChild(forecastItem);
    }
}

// Funkcija za horizontalno pomeranje prognoza
let scrollPosition = 0;
function scrollForecast(direction) {
    const forecastList = document.getElementById("forecast-list");
    const itemWidth = forecastList.firstChild.offsetWidth;
    const scrollAmount = itemWidth + 10; // širina stavke plus razmak

    if (direction === 'next') {
        scrollPosition += scrollAmount;
    } else if (direction === 'prev') {
        scrollPosition -= scrollAmount;
    }
    
    forecastList.style.transform = `translateX(-${scrollPosition}px)`;
}

// Dugmad za navigaciju
document.getElementById("next-button").addEventListener("click", () => scrollForecast('next'));
document.getElementById("prev-button").addEventListener("click", () => scrollForecast('prev'));

// Funkcija za osvežavanje podataka
function refreshWeather() {
    const city = citySelect.value;
    updateWeather(city);
    getWeatherForecast(city); // Pozivamo funkciju za prognozu
}

// Ažuriramo podatke kada korisnik promeni grad
citySelect.addEventListener("change", refreshWeather);

// Postavljanje podrazumevanog grada
const defaultCity = "Sint-Pieters-Leeuw, BE";
citySelect.value = defaultCity;
refreshWeather();
