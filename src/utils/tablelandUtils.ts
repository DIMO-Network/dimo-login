//Values Imported for Tesla Tableland as of April 1st, 2025
export const supportedMakeModels = [
  'Tesla Roadster',
  'Tesla Model Y',
  'Tesla Model S',
  'Tesla Model 3',
  'Tesla Cybertruck',
  'Tesla Model X',
];

export interface MakeModelYearEntry {
  id: string;
  ksuid: string;
  imageURI: string;
}

export const makeModelYearMapping: Record<string, MakeModelYearEntry> = {
  'Tesla Cybertruck 2023': {
    id: 'tesla_cybertruck_2023',
    ksuid: '24GEHVcgPKTOz6ZzBBgCMvAziOs',
    imageURI: '',
  },
  'Tesla Cybertruck 2024': {
    id: 'tesla_cybertruck_2024',
    ksuid: '2ZmzqCPp7mZi3qhOOiJCKuqZRZi',
    imageURI: '',
  },
  'Tesla Model 3 2017': {
    id: 'tesla_model-3_2017',
    ksuid: '22N2yAv2pZjJ4lrBJY8s9e9sNj0',
    imageURI: '',
  },
  'Tesla Model 3 2018': {
    id: 'tesla_model-3_2018',
    ksuid: '22N2y89gBxua0y3HZdG7H1cDF7J',
    imageURI: '',
  },
  'Tesla Model 3 2019': {
    id: 'tesla_model-3_2019',
    ksuid: '22N2yBZUSe71JFaMukYTMI54wlJ',
    imageURI: '',
  },
  'Tesla Model 3 2020': {
    id: 'tesla_model-3_2020',
    ksuid: '22N2y4nhDioUpYKjom0TiLSkzpY',
    imageURI: '',
  },
  'Tesla Model 3 2021': {
    id: 'tesla_model-3_2021',
    ksuid: '22N2y6TCaDBYPUsXJb3u02bqN2I',
    imageURI: '',
  },
  'Tesla Model 3 2022': {
    id: 'tesla_model-3_2022',
    ksuid: '22TESJkijuNV5TS7EB1jEHtFnOy',
    imageURI: '',
  },
  'Tesla Model 3 2023': {
    id: 'tesla_model-3_2023',
    ksuid: '24GEHWNtR6lKZ3H4v9G1YF8zS0g',
    imageURI: '',
  },
  'Tesla Model 3 2024': {
    id: 'tesla_model-3_2024',
    ksuid: '2ZmzaQXuuEnq5VyAAgAdRS2LM6v',
    imageURI: '',
  },
  'Tesla Model S 2012': {
    id: 'tesla_model-s_2012',
    ksuid: '22N2y5Y6fklIi6bt2mF1YNZ19El',
    imageURI: '',
  },
  'Tesla Model S 2013': {
    id: 'tesla_model-s_2013',
    ksuid: '22N2yBsRLmXHxcsiae89vnVQzUs',
    imageURI: '',
  },
  'Tesla Model S 2014': {
    id: 'tesla_model-s_2014',
    ksuid: '22N2y9ELULqLUNi4IVvU6ej5aXv',
    imageURI: '',
  },
  'Tesla Model S 2015': {
    id: 'tesla_model-s_2015',
    ksuid: '22N2y7UGBtGUOjxARBomM3BVcvw',
    imageURI: '',
  },
  'Tesla Model S 2016': {
    id: 'tesla_model-s_2016',
    ksuid: '22N2y9b6pPMYmSrBKXMdERgJOsb',
    imageURI: '',
  },
  'Tesla Model S 2017': {
    id: 'tesla_model-s_2017',
    ksuid: '22N2yBYSiNYgwLFsVTYIrWZnugr',
    imageURI: '',
  },
  'Tesla Model S 2018': {
    id: 'tesla_model-s_2018',
    ksuid: '22N2y5NhK2cEJ5hoGTOvq5awkGF',
    imageURI: '',
  },
  'Tesla Model S 2019': {
    id: 'tesla_model-s_2019',
    ksuid: '22N2y8ETVsQvQu7v9cc6vCiCQUg',
    imageURI: '',
  },
  'Tesla Model S 2020': {
    id: 'tesla_model-s_2020',
    ksuid: '22N2y7kefEvefb3u5fJLDOwP2Wk',
    imageURI: '',
  },
  'Tesla Model S 2021': {
    id: 'tesla_model-s_2021',
    ksuid: '22N2y9gP8EUIsfbmBjWNcgeVJah',
    imageURI: '',
  },
  'Tesla Model S 2022': {
    id: 'tesla_model-s_2022',
    ksuid: '23YcYALNXxFFRtyQAy7kEf4l0e2',
    imageURI: '',
  },
  'Tesla Model S 2023': {
    id: 'tesla_model-s_2023',
    ksuid: '24GEHVc1lH3UgZ8Hfe2okBMUngP',
    imageURI: '',
  },
  'Tesla Model S 2024': {
    id: 'tesla_model-s_2024',
    ksuid: '2ZmzfFfcnQStn8fe0fXf1YxME0z',
    imageURI: '',
  },
  'Tesla Model X 2016': {
    id: 'tesla_model-x_2016',
    ksuid: '22N2yAUfiEweYJIOJEr7eKfRD6N',
    imageURI: '',
  },
  'Tesla Model X 2017': {
    id: 'tesla_model-x_2017',
    ksuid: '22N2y6fsIukcmReyfsT9Kt8PuN2',
    imageURI: '',
  },
  'Tesla Model X 2018': {
    id: 'tesla_model-x_2018',
    ksuid: '22N2yAOSjl1YJ1r286YiBs8T1IW',
    imageURI: '',
  },
  'Tesla Model X 2019': {
    id: 'tesla_model-x_2019',
    ksuid: '22N2yBBge1pgkr0xzIQopgdtM1m',
    imageURI: '',
  },
  'Tesla Model X 2020': {
    id: 'tesla_model-x_2020',
    ksuid: '22N2yAjhe07XBDi8lOvICRWTHpE',
    imageURI: '',
  },
  'Tesla Model X 2021': {
    id: 'tesla_model-x_2021',
    ksuid: '22N2yJVG08Wj8d6bVnRruOI5BoO',
    imageURI: '',
  },
  'Tesla Model X 2022': {
    id: 'tesla_model-x_2022',
    ksuid: '23YcYAaoWnfGYwc0UqBIiAqcVMP',
    imageURI: '',
  },
  'Tesla Model X 2023': {
    id: 'tesla_model-x_2023',
    ksuid: '24GEHZuLIdJQ1JNPsEcudSAmgaf',
    imageURI: '',
  },
  'Tesla Model X 2024': {
    id: 'tesla_model-x_2024',
    ksuid: '2ZmzjXwPQlUqMjkqPM0BrsT7EAP',
    imageURI: '',
  },
  'Tesla Model Y 2020': {
    id: 'tesla_model-y_2020',
    ksuid: '22N2yGjZ60uAS04yFYfsMFZsNNo',
    imageURI: '',
  },
  'Tesla Model Y 2021': {
    id: 'tesla_model-y_2021',
    ksuid: '22N2yK0IllPNivBMVvC0dREjDoV',
    imageURI: '',
  },
  'Tesla Model Y 2022': {
    id: 'tesla_model-y_2022',
    ksuid: '22vVpIY3kbBIhZe5JrBU0QKlUYb',
    imageURI: '',
  },
  'Tesla Model Y 2023': {
    id: 'tesla_model-y_2023',
    ksuid: '24GEHUkYfUluXn4hKhYNWyN1ocO',
    imageURI: '',
  },
  'Tesla Model Y 2024': {
    id: 'tesla_model-y_2024',
    ksuid: '2YiehuNukPDuEjeTo0ewAz02DVR',
    imageURI: '',
  },
  'Tesla Roadster 2008': {
    id: 'tesla_roadster_2008',
    ksuid: '24GEHZsghSp18j6Muf8eaMW56qH',
    imageURI: '',
  },
  'Tesla Roadster 2010': {
    id: 'tesla_roadster_2010',
    ksuid: '24GEHVo0UQ3pTc28VI4XLCieECA',
    imageURI: '',
  },
  'Tesla Roadster 2011': {
    id: 'tesla_roadster_2011',
    ksuid: '24GEHahr8VvQTjPEarUxwUDHHX0',
    imageURI: '',
  },
  'Tesla Roadster 2012': {
    id: 'tesla_roadster_2012',
    ksuid: '26G3mlT1bQSTegnWZz49wM7XHXu',
    imageURI: '',
  },
  'Tesla Roadster 2013': {
    id: 'tesla_roadster_2013',
    ksuid: '26G3mpFd8O735dIJ3HtLU7AEBcd',
    imageURI: '',
  },
  'Tesla Model Y 2019': {
    id: 'tesla_model-y_2019',
    ksuid: '2k0eUTdkd40MHGJy31Po7G30qWS',
    imageURI: '',
  },
  'Tesla Model X 2013': {
    id: 'tesla_model-x_2013',
    ksuid: '2k3wMCzbqcRyGbL9VO9NUwOsX9Q',
    imageURI: '',
  },
  'Tesla Model Y 2025': {
    id: 'tesla_model-y_2025',
    ksuid: '2olgkBgdK17t2SRXdVq1eN4HiKu',
    imageURI: '',
  },
  'Tesla Model 3 2025': {
    id: 'tesla_model-3_2025',
    ksuid: '2pRY06twN967QUyHN0BplGdON5c',
    imageURI: '',
  },
  'Tesla Model S 2025': {
    id: 'tesla_model-s_2025',
    ksuid: '2pRYDOEVaIvQal97W875GmTiqRB',
    imageURI: '',
  },
  'Tesla Model X 2025': {
    id: 'tesla_model-x_2025',
    ksuid: '2pRYL5zOfHdA14xpb4xjdEpRhQy',
    imageURI: '',
  },
  'Tesla Cybertruck 2025': {
    id: 'tesla_cybertruck_2025',
    ksuid: '2pRYPbhXhnX876LnhmRdfNQZMxQ',
    imageURI: '',
  },
  'Tesla Model Y 2026': {
    id: 'tesla_model-y_2026',
    ksuid: '2ubfaz56gAWQRu9xxGm7KkYWNlS',
    imageURI: '',
  },
  'Tesla Model 3 2026': {
    id: 'tesla_model-3_2026',
    ksuid: '2usbARaN9JijOzxWUpTY9Hnavj5',
    imageURI: '',
  },
};
