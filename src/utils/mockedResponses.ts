import { UserDevice } from "../models/deviceDefinitions";
import { MintVehicleNft, TypedData } from "../models/typedData";

export const vehicleCreationResponse: UserDevice = {
  id: "2uEOK5kMjPsUFYSvpYTmGBzWVLO",
  vin: null,
  vinConfirmed: false,
  name: null,
  customImageUrl: null,
  deviceDefinition: {
    deviceDefinitionId: "24GEHVcgPKTOz6ZzBBgCMvAziOs",
    name: "2023 Tesla Cybertruck",
    imageUrl: "",
    make: {
      id: "2681caeN3FuuACJ819ORd1YLvEZ",
      name: "Tesla",
      logo_url: "",
      oem_platform_name: "",
    },
    compatibleIntegrations: [
      {
        id: "26A5Dk3vvvQutjSyF0Jka2DP5lg",
        type: "API",
        style: "OEM",
        vendor: "Tesla",
        region: "Asia",
        country: "USA",
        capabilities: null,
      },
      {
        id: "26A5Dk3vvvQutjSyF0Jka2DP5lg",
        type: "API",
        style: "OEM",
        vendor: "Tesla",
        region: "West Asia",
        country: "USA",
        capabilities: null,
      },
      {
        id: "26A5Dk3vvvQutjSyF0Jka2DP5lg",
        type: "API",
        style: "OEM",
        vendor: "Tesla",
        region: "South America",
        country: "USA",
        capabilities: null,
      },
      {
        id: "26A5Dk3vvvQutjSyF0Jka2DP5lg",
        type: "API",
        style: "OEM",
        vendor: "Tesla",
        region: "Oceania",
        country: "USA",
        capabilities: null,
      },
      {
        id: "26A5Dk3vvvQutjSyF0Jka2DP5lg",
        type: "API",
        style: "OEM",
        vendor: "Tesla",
        region: "Europe",
        country: "USA",
        capabilities: null,
      },
      {
        id: "26A5Dk3vvvQutjSyF0Jka2DP5lg",
        type: "API",
        style: "OEM",
        vendor: "Tesla",
        region: "Americas",
        country: "USA",
        capabilities: null,
      },
    ],
    type: {
      type: "Vehicle",
      make: "Tesla",
      model: "Cybertruck",
      year: 2023,
      subModels: null,
    },
    vehicleData: {},
    deviceAttributes: [
      {
        name: "mpg_highway",
        value: "",
      },
      {
        name: "epa_class",
        value: "",
      },
      {
        name: "generation",
        value: "",
      },
      {
        name: "fuel_tank_capacity_gal",
        value: "",
      },
      {
        name: "mpg",
        value: "",
      },
      {
        name: "mpg_city",
        value: "",
      },
      {
        name: "vehicle_type",
        value: "",
      },
      {
        name: "driven_wheels",
        value: "",
      },
      {
        name: "number_of_doors",
        value: "",
      },
      {
        name: "powertrain_type",
        value: "BEV",
      },
      {
        name: "base_msrp",
        value: "",
      },
      {
        name: "fuel_type",
        value: "",
      },
      {
        name: "wheelbase",
        value: "",
      },
      {
        name: "manufacturer_code",
        value: "",
      },
    ],
    metadata: null,
    verified: true,
    definitionId: "tesla_cybertruck_2023",
  },
  countryCode: "USA",
  integrations: null,
  metadata: {
    powertrainType: "BEV",
    postal_code: null,
    geoDecodedCountry: null,
    geoDecodedStateProv: null,
  },
  optedInAt: null,
  privilegedUsers: null,
};


export const payloadToMintResponse: MintVehicleNft = {
	"types": {
		"EIP712Domain": [
			{
				"name": "name",
				"type": "string"
			},
			{
				"name": "version",
				"type": "string"
			},
			{
				"name": "chainId",
				"type": "uint256"
			},
			{
				"name": "verifyingContract",
				"type": "address"
			}
		],
		"MintVehicleWithDeviceDefinitionSign": [
			{
				"name": "manufacturerNode",
				"type": "uint256"
			},
			{
				"name": "owner",
				"type": "address"
			},
			{
				"name": "deviceDefinitionId",
				"type": "string"
			},
			{
				"name": "attributes",
				"type": "string[]"
			},
			{
				"name": "infos",
				"type": "string[]"
			}
		]
	},
	"primaryType": "MintVehicleWithDeviceDefinitionSign",
	"domain": {
		"name": "DIMO",
		"version": "1",
		"chainId": "0x13882",
		"verifyingContract": "0x5eAA326fB2fc97fAcCe6A79A304876daD0F2e96c",
		"salt": ""
	},
	"message": {
		"attributes": [
			"Make",
			"Model",
			"Year"
		],
		"deviceDefinitionId": "tesla_cybertruck_2023",
		"infos": [
			"Tesla",
			"Cybertruck",
			"2023"
		],
		"manufacturerNode": "0x7f",
		"owner": "0x60A7D007007c459dFE16665Caec415C810ffff6b"
	}
}

