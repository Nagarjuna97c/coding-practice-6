const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const express = require("express");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`Error message:${e.message}`);
  }
};

initializeDbAndServer();

function convertStatesToObject(object) {
  return {
    stateId: object.state_id,
    stateName: object.state_name,
    population: object.population,
  };
}

app.get("/states/", async (request, response) => {
  const getStateList = `
SELECT
*
FROM
state;
`;
  const stateList = await db.all(getStateList);
  response.send(stateList.map((object) => convertStatesToObject(object)));
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateDetails = `
SELECT
*
FROM
state
WHERE 
state_id=${stateId};
`;
  const stateDetails = await db.get(getStateDetails);
  response.send(convertStatesToObject(stateDetails));
});

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const addDistrict = `
INSERT INTO
district (district_name,state_id,cases,cured,active,deaths)
VALUES(
'${districtName}',
${stateId},
${cases},
${cured},
${active},
${deaths});
`;
  const districtId = await db.run(addDistrict);
  response.send("District Successfully Added");
});

function convertDistrictToObject(object) {
  return {
    districtId: object.district_id,
    districtName: object.district_name,
    stateId: object.state_id,
    cases: object.cases,
    cured: object.cured,
    active: object.active,
    deaths: object.deaths,
  };
}

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const selectDistrict = `
    SELECT
         *
    FROM
        district
    WHERE
        district_id=${districtId};
    `;
  const districtDetails = await db.get(selectDistrict);
  response.send(convertDistrictToObject(districtDetails));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrict = `
    DELETE FROM
        district
    WHERE
        district_id=${districtId};
    `;
  await db.run(deleteDistrict);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateDistrict = `
    UPDATE
        district
    SET
        district_name='${districtName}',
        state_id=${stateId},
        cases=${cases},
        cured=${cured},
        active=${active},
        deaths=${deaths}
    WHERE
        district_id=${districtId};
    `;
  await db.run(updateDistrict);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const stateDetails = `
    SELECT
        sum(cases) as totalCases,sum(cured) as totalCured,
        sum(active) as totalActive,sum(deaths) as totalDeaths
    FROM
        district
    WHERE
        state_id=${stateId}
    `;
  const details = await db.get(stateDetails);
  response.send(details);
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateName = `
    SELECT
        state.state_name as stateName
    FROM 
        state JOIN district ON state.state_id=district.state_id
    WHERE
        district.district_id=${districtId};
    `;
  const name = await db.get(stateName);
  response.send(name);
});

module.exports = app;
