require "test_helper"

class UploadsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get uploads_index_url
    assert_response :success
  end

  test "should get initiate" do
    get uploads_initiate_url
    assert_response :success
  end

  test "should get presign" do
    get uploads_presign_url
    assert_response :success
  end

  test "should get complete" do
    get uploads_complete_url
    assert_response :success
  end
end
