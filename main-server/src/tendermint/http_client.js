/**
 * Copyright (c) 2018, 2019 National Digital ID COMPANY LIMITED
 *
 * This file is part of NDID software.
 *
 * NDID is the free software: you can redistribute it and/or modify it under
 * the terms of the Affero GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or any later
 * version.
 *
 * NDID is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Affero GNU General Public License for more details.
 *
 * You should have received a copy of the Affero GNU General Public License
 * along with the NDID source code. If not, see https://www.gnu.org/licenses/agpl.txt.
 *
 * Please contact info@ndid.co.th for any further questions
 *
 */

import fetch from 'node-fetch';

import CustomError from 'ndid-error/custom_error';
import errorType from 'ndid-error/type';

import logger from '../logger';
import { tendermintAddress } from '../config';

async function httpUriCall(method, params) {
  let uri = `http://${tendermintAddress}/${method}`;
  if (params != null) {
    const queryString = params.reduce((paramsString, param) => {
      if (param.key == null || param.value == null) {
        return paramsString;
      }
      const uriEncodedParamValue = encodeURIComponent(param.value);
      if (paramsString !== '') {
        return paramsString + `&${param.key}=${uriEncodedParamValue}`;
      }
      return paramsString + `${param.key}=${uriEncodedParamValue}`;
    }, '');

    if (params.length > 0) {
      uri = uri + `?${queryString}`;
    }
  }

  logger.debug({
    message: 'HTTP call to Tendermint',
    uri,
  });

  try {
    const response = await fetch(uri);
    const responseJson = await response.json();

    if (!response.ok) {
      throw new CustomError({
        errorType: errorType.TENDERMINT_HTTP_CALL_ERROR,
        details: {
          uri,
          response,
          responseJson,
        },
      });
    }

    if (responseJson.error) {
      throw new CustomError({
        errorType: errorType.TENDERMINT_TRANSACT_JSON_RPC_ERROR,
        details: {
          uri,
          error: responseJson.error,
        },
      });
    }

    if (responseJson.result == null) {
      throw new CustomError({
        errorType: errorType.TENDERMINT_HTTP_CALL_UNEXPECTED_RESULT,
        details: {
          uri,
          responseJson,
        },
      });
    }

    return responseJson.result;
  } catch (error) {
    throw new CustomError({
      errorType: errorType.TENDERMINT_HTTP_CALL_ERROR,
      details: {
        uri,
      },
      cause: error,
    });
  }
}

export function abciQuery(data, height) {
  return httpUriCall('abci_query', [
    {
      key: 'data',
      value: `0x${data.toString('hex')}`,
    },
    {
      key: 'height',
      value: height,
    },
  ]);
}

export function broadcastTxCommit(tx) {
  return httpUriCall('broadcast_tx_commit', [
    {
      key: 'tx',
      value: `0x${tx.toString('hex')}`,
    },
  ]);
}

export function broadcastTxSync(tx) {
  return httpUriCall('broadcast_tx_sync', [
    {
      key: 'tx',
      value: `0x${tx.toString('hex')}`,
    },
  ]);
}

export function block(height) {
  return httpUriCall('block', [
    {
      key: 'height',
      value: height,
    },
  ]);
}

export function blockResults(height) {
  return httpUriCall('block_results', [
    {
      key: 'height',
      value: height,
    },
  ]);
}

/**
 *
 * @param {string} hash First 20 bytes of sha256 in hex format
 * @param {string} prove boolean (true|false)
 * @returns {Object}
 */
export function tx(hash, prove) {
  return httpUriCall('tx', [
    {
      key: 'hash',
      value: `0x${hash.toString('hex')}`,
    },
    {
      key: 'prove',
      value: prove,
    },
  ]);
}

export function status() {
  return httpUriCall('status');
}

export function genesis() {
  return httpUriCall('genesis');
}
