#!/bin/sh
set -eu
mkdir -p informes-ci
python3 ops/devops/profesional/secrets.py --mode dir
npm ci --no-audit --no-fund
python3 ops/devops/profesional/quality.py
jest_code=0
npm test -- --json --outputFile=informes-ci/jest.json || jest_code=$?
if test -s informes-ci/jest.json; then
    python3 ops/devops/junit.py informes-ci/jest.json informes-ci/junit.xml
fi
test "$jest_code" -eq 0
test -s informes-ci/junit.xml
npm run build
npm run check:expo
python3 -B ops/expo/deploy.test.py
python3 -B -m unittest discover -s ops/devops -p 'test_*.py'
npm run build:expo
