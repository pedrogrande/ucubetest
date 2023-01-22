require "test_helper"

class PublicControllerTest < ActionDispatch::IntegrationTest
  test "should get home" do
    get public_home_url
    assert_response :success
  end

  test "should get learn" do
    get public_learn_url
    assert_response :success
  end

  test "should get join" do
    get public_join_url
    assert_response :success
  end

  test "should get partner" do
    get public_partner_url
    assert_response :success
  end

  test "should get explore" do
    get public_explore_url
    assert_response :success
  end
end
