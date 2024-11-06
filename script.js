const apiKey = "959d9451d7f23817254ee887e8245961";

// Листа градова са побољшаним форматирањем
const europeanCities = [
    "Belgrade", "Knokke, BE", "Paris", "London", "Berlin", "Madrid", "Rome", "Vienna", "Athens", "Budapest", 
    "Prague", "Warsaw", "Dublin", "Brussels", "Amsterdam", "Lisbon", "Zurich", "Stockholm", 
    "Oslo", "Copenhagen", "Helsinki", "Sofia", "Bucharest", "Ljubljana", "Zagreb", "Podgorica", 
    "Sarajevo", "Skopje", "Tirana", "Sint-Pieters-Leeuw, BE", "Šabac, RS"
].sort(); // Сортирамо градове абецедно

// Кеширање DOM елемената за боље перформансе
const elements = {
    citySelect: document.getElementById("city-select"),
    forecastList: document.getElementById("forecast-list"),
    nextButton: document.getElementById("next-button"),
    prevButton: document.getElementById("prev-button"),
    weatherIcon: document.getElementById("weather-icon")
};

// Иницијализација селекта градова
function initializeCitySelect() {
    const fragment = document.createDocumentFragment();
    europeanCities.forEach(city => {
        const option = document.createElement("option");
        option.value = city;
        option.textContent = city;
        fragment.appendChild(option);
    });
    elements.citySelect.appendChild(fragment);
}

// Асинхрона функција за дохватање података
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Грешка при дохватању података:", error);
        return null;
    }
}

// Функција за ажурирање временских података са управљањем грешкама
async function updateWeather(city) {
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=fr`;
    
    const data = await fetchData(apiUrl);
    if (!data) return;

    try {
        // Ажурирање UI елемената са провером постојања података
        document.getElementById("temperature").textContent = data.main?.temp?.toFixed(1) ?? "--";
        document.getElementById("humidity").textContent = data.main?.humidity ?? "--";
        document.getElementById("description").textContent = data.weather?.[0]?.description ?? "--";
        document.getElementById("wind-speed").textContent = data.wind?.speed?.toFixed(1) ?? "--";
        
        const precipitation = data.rain?.["1h"] || 0;
        document.getElementById("precipitation").textContent = precipitation.toFixed(1);

        if (data.coord) {
            await Promise.all([
                getUVIndex(data.coord.lat, data.coord.lon),
                getPollutionIndex(data.coord.lat, data.coord.lon)
            ]);
        }

        // Оптимизовано учитавање иконице
        const iconCode = data.weather?.[0]?.icon;
        if (iconCode) {
            elements.weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
            elements.weatherIcon.loading = "lazy"; // Лазy лоадинг за иконице
        }
    } catch (error) {
        console.error("Грешка при ажурирању UI:", error);
    }
}

// Оптимизована функција за UV индекс
async function getUVIndex(lat, lon) {
    const apiUrl = `https://api.openweathermap.org/data/2.5/uvi?appid=${apiKey}&lat=${lat}&lon=${lon}`;
    const data = await fetchData(apiUrl);
    if (data) {
        document.getElementById("uv-index").textContent = data.value?.toFixed(1) ?? "--";
    }
}

// Оптимизована функција за индекс загађења
async function getPollutionIndex(lat, lon) {
    const apiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?appid=${apiKey}&lat=${lat}&lon=${lon}`;
    const data = await fetchData(apiUrl);
    if (data) {
        document.getElementById("pollution").textContent = data.list?.[0]?.main?.aqi ?? "--";
    }
}

// Побољшана функција за приказ прогнозе
async function getWeatherForecast(city) {
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=fr`;
    const data = await fetchData(forecastUrl);
    if (data) {
        displayForecast(data);
    }
}

// Оптимизована функција за приказ прогнозе
function displayForecast(data) {
    elements.forecastList.innerHTML = "";
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < data.list.length; i += 8) {
        const dayData = data.list[i];
        const date = new Date(dayData.dt * 1000).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "short"
        });

        const forecastItem = document.createElement("div");
        forecastItem.classList.add("forecast-item");
        forecastItem.innerHTML = `
            <p class="forecast-date">${date}</p>
            <img src="https://openweathermap.org/img/wn/${dayData.weather[0].icon}@2x.png" 
                 alt="${dayData.weather[0].description}" 
                 class="forecast-icon"
                 loading="lazy">
            <p class="forecast-temp">${Math.round(dayData.main.temp)}°C</p>
            <p class="forecast-desc">${dayData.weather[0].description}</p>
        `;
        fragment.appendChild(forecastItem);
    }

    elements.forecastList.appendChild(fragment);
    scrollPosition = 0;
    elements.forecastList.style.transform = "translateX(0)";
}

// Побољшана функција за скроловање прогнозе
let scrollPosition = 0;
const scrollForecast = (() => {
    let scrolling = false;

    return (direction) => {
        if (scrolling) return;
        scrolling = true;

        const itemWidth = elements.forecastList.firstChild?.offsetWidth ?? 0;
        const scrollAmount = itemWidth + 10;
        const maxScroll = elements.forecastList.scrollWidth - elements.forecastList.clientWidth;

        if (direction === 'next' && scrollPosition < maxScroll) {
            scrollPosition = Math.min(scrollPosition + scrollAmount, maxScroll);
        } else if (direction === 'prev' && scrollPosition > 0) {
            scrollPosition = Math.max(scrollPosition - scrollAmount, 0);
        }

        elements.forecastList.style.transform = `translateX(-${scrollPosition}px)`;
        
        setTimeout(() => {
            scrolling = false;
        }, 300); // Спречава пребрзо скроловање
    };
})();

// Функција за освежавање података
const refreshWeather = async () => {
    const city = elements.citySelect.value;
    await Promise.all([
        updateWeather(city),
        getWeatherForecast(city)
    ]);
};

// Event listeners
elements.nextButton.addEventListener("click", () => scrollForecast('next'));
elements.prevButton.addEventListener("click", () => scrollForecast('prev'));
elements.citySelect.addEventListener("change", refreshWeather);

// Иницијализација апликације
(() => {
    initializeCitySelect();
    const defaultCity = "Sint-Pieters-Leeuw, BE";
    elements.citySelect.value = defaultCity;
    refreshWeather();

    // Додајемо подршку за touch догађаје за iOS
    let touchStartX = 0;
    elements.forecastList.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });

    elements.forecastList.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > 50) { // Минимална удаљеност за свајп
            scrollForecast(diff > 0 ? 'next' : 'prev');
        }
    }, { passive: true });
})();